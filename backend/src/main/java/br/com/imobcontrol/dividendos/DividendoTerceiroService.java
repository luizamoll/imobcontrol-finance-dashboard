package br.com.imobcontrol.dividendos;

import br.com.imobcontrol.tenant.TenantContextService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
public class DividendoTerceiroService {

    private static final BigDecimal CEM = new BigDecimal("100.00");
    private static final BigDecimal TOLERANCIA = new BigDecimal("0.01");

    private final DividendoTerceiroRepository repositorio;
    private final TenantContextService tenants;
    private final ObjectMapper json;

    public DividendoTerceiroService(
            DividendoTerceiroRepository repositorio,
            TenantContextService tenants,
            ObjectMapper json
    ) {
        this.repositorio = repositorio;
        this.tenants = tenants;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public List<DividendoTerceiroResponse> listar(Authentication auth, Long empresaId) {
        var ctx = tenants.resolver(auth, empresaId);
        return repositorio.findAllByEmpresaIdOrderByAtualizadoEmDesc(ctx.empresaId())
                .stream()
                .map(this::resposta)
                .toList();
    }

    @Transactional
    public DividendoTerceiroResponse cadastrar(
            Authentication auth,
            Long empresaId,
            DividendoTerceiroRequest dados
    ) {
        var ctx = tenants.resolver(auth, empresaId);
        validarParticipantes(dados.participantes());

        DividendoTerceiro item = new DividendoTerceiro();
        item.setEmpresaId(ctx.empresaId());
        item.setCriadoPorUsuarioId(ctx.usuarioId());
        item.setAtualizadoPorUsuarioId(ctx.usuarioId());
        preencher(item, dados);

        return resposta(repositorio.saveAndFlush(item));
    }

    @Transactional
    public DividendoTerceiroResponse atualizar(
            Authentication auth,
            Long empresaId,
            Long id,
            DividendoTerceiroRequest dados
    ) {
        var ctx = tenants.resolver(auth, empresaId);
        DividendoTerceiro item = localizar(ctx.empresaId(), id);

        if (dados.versao() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a versão atual do cadastro");
        }
        if (!Objects.equals(dados.versao(), item.getVersao())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este controle foi alterado por outro usuário. Atualize a tela antes de salvar."
            );
        }

        validarParticipantes(dados.participantes());
        preencher(item, dados);
        item.setAtualizadoPorUsuarioId(ctx.usuarioId());

        try {
            return resposta(repositorio.saveAndFlush(item));
        } catch (OptimisticLockingFailureException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este controle foi alterado por outro usuário",
                    e
            );
        }
    }

    @Transactional
    public void excluir(Authentication auth, Long empresaId, Long id) {
        var ctx = tenants.resolver(auth, empresaId);
        repositorio.delete(localizar(ctx.empresaId(), id));
        repositorio.flush();
    }

    private DividendoTerceiro localizar(Long empresaId, Long id) {
        return repositorio.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private void preencher(DividendoTerceiro item, DividendoTerceiroRequest dados) {
        item.setImovel(dados.imovel().trim());
        item.setValorBase(dados.valorBase());
        item.setObservacoes(texto(dados.observacoes()));
        try {
            item.setParticipantesJson(json.writeValueAsString(
                    dados.participantes().stream()
                            .map(p -> new ParticipanteDividendo(p.nome().trim(), p.percentual()))
                            .toList()
            ));
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível salvar os participantes",
                    e
            );
        }
    }

    private void validarParticipantes(List<ParticipanteDividendo> participantes) {
        BigDecimal total = BigDecimal.ZERO;
        Set<String> nomes = new HashSet<>();

        for (ParticipanteDividendo participante : participantes) {
            String chave = participante.nome().trim().toLowerCase(Locale.ROOT);
            if (!nomes.add(chave)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "O mesmo participante não pode aparecer duas vezes"
                );
            }
            total = total.add(participante.percentual());
        }

        if (total.subtract(CEM).abs().compareTo(TOLERANCIA) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A soma dos percentuais precisa totalizar 100%"
            );
        }
    }

    private DividendoTerceiroResponse resposta(DividendoTerceiro item) {
        try {
            List<ParticipanteDividendo> participantes = json.readValue(
                    item.getParticipantesJson(),
                    new TypeReference<List<ParticipanteDividendo>>() {}
            );
            return new DividendoTerceiroResponse(
                    item.getId(),
                    item.getEmpresaId(),
                    item.getImovel(),
                    item.getValorBase(),
                    item.getObservacoes(),
                    participantes,
                    item.getVersao(),
                    item.getCriadoEm(),
                    item.getAtualizadoEm()
            );
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Cadastro de dividendos inválido",
                    e
            );
        }
    }

    private static String texto(String valor) {
        if (valor == null || valor.isBlank()) return null;
        return valor.trim();
    }
}
