package br.com.imobcontrol.operacao;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import br.com.imobcontrol.tenant.TenantContextService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class OperacaoCatalogoService {

    private final EmpreendimentoRepository empreendimentos;
    private final QuadraRepository quadras;
    private final UnidadeRepository unidades;
    private final AuditoriaOperacionalRepository auditoria;
    private final TenantContextService tenants;
    private final ObjectMapper objectMapper;

    public OperacaoCatalogoService(
            EmpreendimentoRepository empreendimentos,
            QuadraRepository quadras,
            UnidadeRepository unidades,
            AuditoriaOperacionalRepository auditoria,
            TenantContextService tenants,
            ObjectMapper objectMapper
    ) {
        this.empreendimentos = empreendimentos;
        this.quadras = quadras;
        this.unidades = unidades;
        this.auditoria = auditoria;
        this.tenants = tenants;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<EmpreendimentoResponse> listarEmpreendimentos(
            Authentication autenticacao,
            Long empresaSolicitada,
            int pagina,
            int tamanho
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        if (pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }
        return empreendimentos.findByEmpresaId(
                ctx.empresaId(),
                PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.ASC, "nome"))
        ).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public EmpreendimentoResponse detalharEmpreendimento(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        return toResponse(empreendimento(ctx.empresaId(), id));
    }

    @Transactional
    public EmpreendimentoResponse criarEmpreendimento(
            Authentication autenticacao,
            Long empresaSolicitada,
            EmpreendimentoRequest body
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        Empreendimento e = new Empreendimento();
        e.setEmpresaId(ctx.empresaId());
        e.setCriadoPorUsuarioId(ctx.usuarioId());
        e.setAtualizadoPorUsuarioId(ctx.usuarioId());
        preencher(e, body);
        Empreendimento salvo = salvarEmpreendimento(e);
        registrar(ctx, "EMPREENDIMENTO", salvo.getId(), "CRIACAO");
        return toResponse(salvo);
    }

    @Transactional
    public EmpreendimentoResponse atualizarEmpreendimento(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id,
            EmpreendimentoRequest body
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        Empreendimento atual = empreendimento(ctx.empresaId(), id);
        exigirVersao(body.versao(), atual.getVersao());
        preencher(atual, body);
        atual.setAtualizadoPorUsuarioId(ctx.usuarioId());
        Empreendimento salvo = salvarEmpreendimento(atual);
        registrar(ctx, "EMPREENDIMENTO", salvo.getId(), "ATUALIZACAO");
        return toResponse(salvo);
    }

    @Transactional(readOnly = true)
    public List<QuadraResponse> listarQuadras(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long empreendimentoId
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        empreendimento(ctx.empresaId(), empreendimentoId);
        return quadras.findAllByEmpresaIdAndEmpreendimentoIdOrderByNomeAsc(
                ctx.empresaId(), empreendimentoId
        ).stream().map(this::toResponse).toList();
    }

    @Transactional
    public QuadraResponse criarQuadra(
            Authentication autenticacao,
            Long empresaSolicitada,
            QuadraRequest body
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        empreendimento(ctx.empresaId(), body.empreendimentoId());

        Quadra q = new Quadra();
        q.setEmpresaId(ctx.empresaId());
        q.setEmpreendimentoId(body.empreendimentoId());
        q.setCriadoPorUsuarioId(ctx.usuarioId());
        q.setAtualizadoPorUsuarioId(ctx.usuarioId());
        preencher(q, body);

        Quadra salva = salvarQuadra(q);
        registrar(ctx, "QUADRA", salva.getId(), "CRIACAO");
        return toResponse(salva);
    }

    @Transactional
    public QuadraResponse atualizarQuadra(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id,
            QuadraRequest body
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        Quadra atual = quadra(ctx.empresaId(), id);
        exigirVersao(body.versao(), atual.getVersao());
        if (!Objects.equals(atual.getEmpreendimentoId(), body.empreendimentoId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Não é permitido mover uma quadra para outro empreendimento"
            );
        }

        preencher(atual, body);
        atual.setAtualizadoPorUsuarioId(ctx.usuarioId());
        Quadra salva = salvarQuadra(atual);
        registrar(ctx, "QUADRA", salva.getId(), "ATUALIZACAO");
        return toResponse(salva);
    }

    @Transactional(readOnly = true)
    public List<UnidadeResponse> listarUnidades(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long empreendimentoId
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        empreendimento(ctx.empresaId(), empreendimentoId);
        return unidades.findAllByEmpresaIdAndEmpreendimentoIdOrderByNumeroAsc(
                ctx.empresaId(), empreendimentoId
        ).stream().map(this::toResponse).toList();
    }

    @Transactional
    public UnidadeResponse criarUnidade(
            Authentication autenticacao,
            Long empresaSolicitada,
            UnidadeRequest body
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        empreendimento(ctx.empresaId(), body.empreendimentoId());
        validarQuadraDaUnidade(ctx.empresaId(), body.empreendimentoId(), body.quadraId());

        Unidade u = new Unidade();
        u.setEmpresaId(ctx.empresaId());
        u.setEmpreendimentoId(body.empreendimentoId());
        u.setCriadoPorUsuarioId(ctx.usuarioId());
        u.setAtualizadoPorUsuarioId(ctx.usuarioId());
        preencher(u, body);

        Unidade salva = salvarUnidade(u);
        registrar(ctx, "UNIDADE", salva.getId(), "CRIACAO");
        return toResponse(salva);
    }

    @Transactional
    public UnidadeResponse atualizarUnidade(
            Authentication autenticacao,
            Long empresaSolicitada,
            Long id,
            UnidadeRequest body
    ) {
        TenantContextService.Contexto ctx = tenants.resolver(autenticacao, empresaSolicitada);
        Unidade atual = unidade(ctx.empresaId(), id);
        exigirVersao(body.versao(), atual.getVersao());

        if (!Objects.equals(atual.getEmpreendimentoId(), body.empreendimentoId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Não é permitido mover uma unidade para outro empreendimento"
            );
        }

        validarQuadraDaUnidade(ctx.empresaId(), body.empreendimentoId(), body.quadraId());
        preencher(atual, body);
        atual.setAtualizadoPorUsuarioId(ctx.usuarioId());
        Unidade salva = salvarUnidade(atual);
        registrar(ctx, "UNIDADE", salva.getId(), "ATUALIZACAO");
        return toResponse(salva);
    }

    private void preencher(Empreendimento e, EmpreendimentoRequest body) {
        e.setNome(body.nome().trim());
        e.setSpe(texto(body.spe()));
        e.setCnpj(normalizarDocumento(body.cnpj(), 14, "CNPJ"));
        e.setAreaTotal(valor(body.areaTotal()));
        e.setTipo(body.tipo().trim().toLowerCase(Locale.ROOT));
        e.setUnidadesPrevistas(body.unidadesPrevistas());
        e.setValorTotal(valor(body.valorTotal()));
        e.setSocioPct(valor(body.socioPct()));
        e.setEmpresaPct(valor(body.empresaPct()));
        e.setCorretorPct(valor(body.corretorPct()));
        e.setAliquotaTributaria(valor(body.aliquotaTributaria()));
        e.setRepasseComissaoPct(valor(body.repasseComissaoPct()));
        e.setComissaoSobreAcrescimos(body.comissaoSobreAcrescimos());
        e.setInadimplenciaJson(json(body.inadimplencia()));
        e.setObservacoes(texto(body.observacoes()));
        e.setStatus(body.status().trim().toLowerCase(Locale.ROOT));
    }

    private void preencher(Quadra q, QuadraRequest body) {
        q.setNome(body.nome().trim());
        q.setDescricao(texto(body.descricao()));
        q.setRegrasJson(json(body.regras()));
    }

    private void preencher(Unidade u, UnidadeRequest body) {
        u.setQuadraId(body.quadraId());
        u.setNumero(body.numero().trim());
        u.setUnidade(body.unidade().trim());
        u.setUnidadeTipo(texto(body.unidadeTipo()));
        u.setDescricao(texto(body.descricao()));
        u.setArea(valor(body.area()));
        u.setValorVenda(valor(body.valorVenda()));
        u.setStatus(body.status().trim().toLowerCase(Locale.ROOT));
        u.setRegrasJson(json(body.regras()));
    }

    private void validarQuadraDaUnidade(Long empresaId, Long empreendimentoId, Long quadraId) {
        if (quadraId == null) return;
        Quadra q = quadra(empresaId, quadraId);
        if (!Objects.equals(q.getEmpreendimentoId(), empreendimentoId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A quadra selecionada não pertence a este empreendimento"
            );
        }
    }

    private Empreendimento empreendimento(Long empresaId, Long id) {
        return empreendimentos.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Quadra quadra(Long empresaId, Long id) {
        return quadras.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Unidade unidade(Long empresaId, Long id) {
        return unidades.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private void exigirVersao(Long recebida, Long atual) {
        if (recebida == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a versão atual do cadastro");
        }
        if (!Objects.equals(recebida, atual)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este cadastro foi alterado por outro usuário. Atualize a tela antes de salvar."
            );
        }
    }

    private Empreendimento salvarEmpreendimento(Empreendimento e) {
        try {
            return empreendimentos.saveAndFlush(e);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Empreendimento inconsistente", ex);
        } catch (OptimisticLockingFailureException ex) {
            throw conflitoConcorrencia(ex);
        }
    }

    private Quadra salvarQuadra(Quadra q) {
        try {
            return quadras.saveAndFlush(q);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Já existe uma quadra com este nome no empreendimento",
                    ex
            );
        } catch (OptimisticLockingFailureException ex) {
            throw conflitoConcorrencia(ex);
        }
    }

    private Unidade salvarUnidade(Unidade u) {
        try {
            return unidades.saveAndFlush(u);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Já existe uma unidade com este número no empreendimento",
                    ex
            );
        } catch (OptimisticLockingFailureException ex) {
            throw conflitoConcorrencia(ex);
        }
    }

    private ResponseStatusException conflitoConcorrencia(Exception ex) {
        return new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Cadastro alterado por outro usuário. Atualize a tela.",
                ex
        );
    }

    private void registrar(
            TenantContextService.Contexto ctx,
            String entidade,
            Long entidadeId,
            String acao
    ) {
        auditoria.save(new AuditoriaOperacional(
                ctx.empresaId(),
                ctx.usuarioId(),
                entidade,
                entidadeId,
                acao
        ));
    }

    private String json(JsonNode node) {
        if (node == null || node.isNull()) return null;
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JSON de regras inválido", ex);
        }
    }

    private JsonNode json(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("JSON persistido inválido", ex);
        }
    }

    private EmpreendimentoResponse toResponse(Empreendimento e) {
        return new EmpreendimentoResponse(
                e.getId(),
                e.getEmpresaId(),
                e.getNome(),
                e.getSpe(),
                e.getCnpj(),
                e.getAreaTotal(),
                e.getTipo(),
                e.getUnidadesPrevistas(),
                e.getValorTotal(),
                e.getSocioPct(),
                e.getEmpresaPct(),
                e.getCorretorPct(),
                e.getAliquotaTributaria(),
                e.getRepasseComissaoPct(),
                e.isComissaoSobreAcrescimos(),
                json(e.getInadimplenciaJson()),
                e.getObservacoes(),
                e.getStatus(),
                e.getVersao(),
                e.getCriadoEm(),
                e.getAtualizadoEm()
        );
    }

    private QuadraResponse toResponse(Quadra q) {
        return new QuadraResponse(
                q.getId(),
                q.getEmpresaId(),
                q.getEmpreendimentoId(),
                q.getNome(),
                q.getDescricao(),
                json(q.getRegrasJson()),
                q.getVersao(),
                q.getCriadoEm(),
                q.getAtualizadoEm()
        );
    }

    private UnidadeResponse toResponse(Unidade u) {
        return new UnidadeResponse(
                u.getId(),
                u.getEmpresaId(),
                u.getEmpreendimentoId(),
                u.getQuadraId(),
                u.getNumero(),
                u.getUnidade(),
                u.getUnidadeTipo(),
                u.getDescricao(),
                u.getArea(),
                u.getValorVenda(),
                u.getStatus(),
                json(u.getRegrasJson()),
                u.getVersao(),
                u.getCriadoEm(),
                u.getAtualizadoEm()
        );
    }

    private BigDecimal valor(BigDecimal valor) {
        return valor == null ? BigDecimal.ZERO : valor;
    }

    private String texto(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.trim();
    }

    private String normalizarDocumento(String valor, int tamanho, String nome) {
        if (valor == null || valor.isBlank()) return null;
        String digitos = valor.replaceAll("\\D", "");
        if (digitos.length() != tamanho) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, nome + " inválido");
        }
        return digitos;
    }
}
