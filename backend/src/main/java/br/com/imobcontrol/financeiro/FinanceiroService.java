package br.com.imobcontrol.financeiro;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import br.com.imobcontrol.cliente.Cliente;
import br.com.imobcontrol.cliente.ClienteRepository;
import br.com.imobcontrol.operacao.Empreendimento;
import br.com.imobcontrol.operacao.EmpreendimentoRepository;
import br.com.imobcontrol.operacao.Quadra;
import br.com.imobcontrol.operacao.QuadraRepository;
import br.com.imobcontrol.operacao.Unidade;
import br.com.imobcontrol.operacao.UnidadeRepository;
import br.com.imobcontrol.tenant.TenantContextService;
import br.com.imobcontrol.tenant.UsuarioRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class FinanceiroService {

    private static final BigDecimal CEM = new BigDecimal("100");
    private static final BigDecimal TRINTA = new BigDecimal("30");

    private final VendaRepository vendas;
    private final PagamentoItemRepository pagamentos;
    private final ParcelaRepository parcelas;
    private final MovimentoRepository movimentos;
    private final EmpreendimentoRepository empreendimentos;
    private final QuadraRepository quadras;
    private final UnidadeRepository unidades;
    private final ClienteRepository clientes;
    private final UsuarioRepository usuarios;
    private final AuditoriaOperacionalRepository auditoria;
    private final TenantContextService tenants;
    private final JsonMapper json;

    public FinanceiroService(
            VendaRepository vendas,
            PagamentoItemRepository pagamentos,
            ParcelaRepository parcelas,
            MovimentoRepository movimentos,
            EmpreendimentoRepository empreendimentos,
            QuadraRepository quadras,
            UnidadeRepository unidades,
            ClienteRepository clientes,
            UsuarioRepository usuarios,
            AuditoriaOperacionalRepository auditoria,
            TenantContextService tenants,
            JsonMapper json
    ) {
        this.vendas = vendas;
        this.pagamentos = pagamentos;
        this.parcelas = parcelas;
        this.movimentos = movimentos;
        this.empreendimentos = empreendimentos;
        this.quadras = quadras;
        this.unidades = unidades;
        this.clientes = clientes;
        this.usuarios = usuarios;
        this.auditoria = auditoria;
        this.tenants = tenants;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public Page<VendaResponse> listarVendas(
            Authentication auth, Long empresaSolicitada, int pagina, int tamanho
    ) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        if (pagina < 0 || tamanho < 1 || tamanho > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }
        return vendas.findByEmpresaId(
                ctx.empresaId(),
                PageRequest.of(pagina, tamanho, Sort.by(Sort.Direction.DESC, "dataContrato", "id"))
        ).map(v -> toVendaResponse(ctx.empresaId(), v));
    }

    @Transactional(readOnly = true)
    public VendaResponse detalharVenda(Authentication auth, Long empresaSolicitada, Long id) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        return toVendaResponse(ctx.empresaId(), venda(ctx.empresaId(), id));
    }

    @Transactional
    public VendaResponse criarVenda(
            Authentication auth, Long empresaSolicitada, VendaRequest body
    ) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        Empreendimento emp = empreendimento(ctx.empresaId(), body.empreendimentoId());
        Unidade unidade = unidade(ctx.empresaId(), body.unidadeId());
        Cliente cliente = cliente(ctx.empresaId(), body.clienteId());

        if (!Objects.equals(unidade.getEmpreendimentoId(), emp.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A unidade não pertence ao empreendimento");
        }
        if (!"disponivel".equalsIgnoreCase(unidade.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A unidade não está disponível");
        }
        if (vendas.existsByEmpresaIdAndUnidadeIdAndStatus(ctx.empresaId(), unidade.getId(), "ativa")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe venda ativa para esta unidade");
        }

        validarComposicao(body);

        JsonNode regras = aplicarInadimplencia(
                regrasEfetivas(emp, unidade),
                body.regrasInadimplencia()
        );
        Venda venda = new Venda();
        venda.setEmpresaId(ctx.empresaId());
        venda.setEmpreendimentoId(emp.getId());
        venda.setUnidadeId(unidade.getId());
        venda.setClienteId(cliente.getId());
        venda.setValorTotal(moeda(body.valorTotal()));
        venda.setDataContrato(body.dataContrato());
        venda.setCorretorNome(texto(body.corretorNome()));
        venda.setCorretorPct(percentual(body.corretorPct()));
        venda.setRepasseComissaoPct(percentual(body.repasseComissaoPct()));
        venda.setComissaoSobreAcrescimos(body.comissaoSobreAcrescimos());
        venda.setObservacoes(texto(body.observacoes()));
        venda.setStatus("ativa");
        venda.setRegrasJson(escrever(regras));
        venda.setCriadoPorUsuarioId(ctx.usuarioId());
        venda.setAtualizadoPorUsuarioId(ctx.usuarioId());

        Venda salva = vendas.saveAndFlush(venda);
        criarComposicaoEParcelas(ctx.empresaId(), salva, body.composicao(), regras);

        unidade.setStatus("vendido");
        unidade.setAtualizadoPorUsuarioId(ctx.usuarioId());
        unidades.saveAndFlush(unidade);

        registrar(
                ctx,
                "VENDA",
                salva.getId(),
                "CRIACAO",
                "Venda criada para " + cliente.getNome()
                        + " no valor de " + dinheiro(salva.getValorTotal())
                        + " · contrato em " + dataLegivel(salva.getDataContrato())
        );
        return toVendaResponse(ctx.empresaId(), salva);
    }

    @Transactional
    public VendaResponse atualizarVenda(
            Authentication auth, Long empresaSolicitada, Long id, VendaRequest body
    ) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        Venda atual = venda(ctx.empresaId(), id);
        exigirVersao(body.versao(), atual.getVersao());

        if (!Objects.equals(atual.getEmpreendimentoId(), body.empreendimentoId())
                || !Objects.equals(atual.getUnidadeId(), body.unidadeId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Não é permitido mover uma venda para outro empreendimento ou unidade"
            );
        }

        Cliente clienteAtualizado = cliente(ctx.empresaId(), body.clienteId());
        boolean possuiRecebimentos =
                movimentos.existsByEmpresaIdAndVendaIdAndEstornadoFalse(ctx.empresaId(), atual.getId());
        JsonNode regrasAtuais = ler(atual.getRegrasJson());
        JsonNode regrasAtualizadas = aplicarInadimplencia(
                regrasAtuais,
                body.regrasInadimplencia()
        );
        boolean composicaoAlterada =
                !mesmaComposicao(ctx.empresaId(), atual.getId(), body.composicao());
        String detalhesAlteracao = descreverAlteracoesVenda(
                ctx.empresaId(),
                atual,
                body,
                clienteAtualizado,
                regrasAtuais,
                regrasAtualizadas,
                composicaoAlterada
        );

        if (possuiRecebimentos) {
            if (!Objects.equals(atual.getClienteId(), body.clienteId())
                    || atual.getValorTotal().compareTo(moeda(body.valorTotal())) != 0
                    || composicaoAlterada) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "A venda já possui recebimentos. Cliente, valor e parcelas não podem ser reescritos."
                );
            }
        } else {
            validarComposicao(body);
            atual.setClienteId(body.clienteId());
            atual.setValorTotal(moeda(body.valorTotal()));
            pagamentos.deleteByEmpresaIdAndVendaId(ctx.empresaId(), atual.getId());
            parcelas.deleteByEmpresaIdAndVendaId(ctx.empresaId(), atual.getId());
            criarComposicaoEParcelas(
                    ctx.empresaId(),
                    atual,
                    body.composicao(),
                    regrasAtualizadas
            );
        }

        atual.setDataContrato(body.dataContrato());
        atual.setCorretorNome(texto(body.corretorNome()));
        atual.setCorretorPct(percentual(body.corretorPct()));
        atual.setRepasseComissaoPct(percentual(body.repasseComissaoPct()));
        atual.setComissaoSobreAcrescimos(body.comissaoSobreAcrescimos());
        atual.setObservacoes(texto(body.observacoes()));
        atual.setRegrasJson(escrever(regrasAtualizadas));
        atual.setAtualizadoPorUsuarioId(ctx.usuarioId());

        Venda salva = vendas.saveAndFlush(atual);
        atualizarRegrasParcelasAbertas(ctx.empresaId(), salva.getId(), regrasAtualizadas);
        registrar(
                ctx,
                "VENDA",
                salva.getId(),
                "ATUALIZACAO",
                detalhesAlteracao.isBlank() ? "Venda salva sem alteração material identificada." : detalhesAlteracao
        );
        return toVendaResponse(ctx.empresaId(), salva);
    }

    @Transactional
    public void excluirVenda(Authentication auth, Long empresaSolicitada, Long id) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        Venda atual = venda(ctx.empresaId(), id);

        if (movimentos.existsByEmpresaIdAndVendaId(ctx.empresaId(), atual.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Esta venda possui histórico de recebimentos e não pode ser excluída. Reverta os recebimentos e preserve o histórico financeiro."
            );
        }

        Unidade unidade = unidade(ctx.empresaId(), atual.getUnidadeId());

        pagamentos.deleteByEmpresaIdAndVendaId(ctx.empresaId(), atual.getId());
        parcelas.deleteByEmpresaIdAndVendaId(ctx.empresaId(), atual.getId());
        pagamentos.flush();
        parcelas.flush();

        vendas.delete(atual);
        vendas.flush();

        unidade.setStatus("disponivel");
        unidade.setAtualizadoPorUsuarioId(ctx.usuarioId());
        unidades.saveAndFlush(unidade);

        registrar(
                ctx,
                "VENDA",
                id,
                "EXCLUSAO",
                "Venda excluída · valor " + dinheiro(atual.getValorTotal())
                        + " · unidade devolvida para Disponível"
        );
    }

    @Transactional(readOnly = true)
    public List<VendaHistoricoResponse> listarHistoricoVenda(
            Authentication auth,
            Long empresaSolicitada,
            Long vendaId
    ) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        venda(ctx.empresaId(), vendaId);

        return auditoria
                .findAllByEmpresaIdAndEntidadeAndEntidadeIdOrderByCriadoEmDescIdDesc(
                        ctx.empresaId(),
                        "VENDA",
                        vendaId
                )
                .stream()
                .map(registro -> new VendaHistoricoResponse(
                        registro.getId(),
                        registro.getUsuarioId(),
                        usuarios.findById(registro.getUsuarioId())
                                .map(usuario -> usuario.getNome())
                                .orElse("Usuário #" + registro.getUsuarioId()),
                        registro.getAcao(),
                        registro.getDetalhes(),
                        registro.getCriadoEm()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ParcelaResponse> listarParcelas(Authentication auth, Long empresaSolicitada) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        return parcelas.findAllByEmpresaIdOrderByVencimentoAscIdAsc(ctx.empresaId())
                .stream()
                .map(p -> toParcelaResponse(ctx.empresaId(), p))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MovimentoResponse> listarMovimentos(Authentication auth, Long empresaSolicitada) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        return movimentos.findAllByEmpresaIdAndEstornadoFalseOrderByDataMovimentoDescIdDesc(ctx.empresaId())
                .stream()
                .map(m -> toMovimentoResponse(ctx.empresaId(), m))
                .toList();
    }

    @Transactional
    public MovimentoResponse receber(
            Authentication auth,
            Long empresaSolicitada,
            Long parcelaId,
            RecebimentoRequest body
    ) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        Parcela parcela = parcela(ctx.empresaId(), parcelaId);
        if ("paga".equalsIgnoreCase(parcela.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta parcela já está paga");
        }
        if ("cancelada".equalsIgnoreCase(parcela.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Parcela cancelada não pode ser recebida");
        }

        Venda venda = venda(ctx.empresaId(), parcela.getVendaId());
        LocalDate data = body.data() == null ? LocalDate.now() : body.data();
        BigDecimal corrigido = valorCorrigido(parcela, data);
        BigDecimal recebido = body.valorRecebido() == null ? corrigido : moeda(body.valorRecebido());
        if (recebido.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor recebido inválido");
        }

        JsonNode regras = ler(venda.getRegrasJson());
        BigDecimal aliquota = decimal(regras, "aliquotaTributaria", BigDecimal.ZERO);
        BigDecimal empresaPct = decimal(regras, "empresaPct", BigDecimal.ZERO);
        BigDecimal socioPct = decimal(regras, "socioPct", BigDecimal.ZERO);

        BigDecimal imposto = porcentagem(recebido, aliquota);
        BigDecimal comissaoTotal = porcentagem(venda.getValorTotal(), venda.getCorretorPct());
        BigDecimal comissaoJaPaga = movimentos
                .findAllByEmpresaIdAndVendaIdAndEstornadoFalseOrderByDataMovimentoAscIdAsc(
                        ctx.empresaId(), venda.getId()
                )
                .stream()
                .map(Movimento::getComissaoPaga)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal saldoComissaoAntes = maxZero(comissaoTotal.subtract(comissaoJaPaga));
        BigDecimal acrescimos = maxZero(recebido.subtract(parcela.getValor()));
        BigDecimal baseComissao = venda.isComissaoSobreAcrescimos()
                ? recebido
                : recebido.min(parcela.getValor());
        BigDecimal comissaoTeorica = porcentagem(baseComissao, venda.getRepasseComissaoPct());
        BigDecimal comissao = comissaoTeorica.min(saldoComissaoAntes);
        BigDecimal limiteDepoisImposto = maxZero(recebido.subtract(imposto));
        if (comissao.compareTo(limiteDepoisImposto) > 0) comissao = limiteDepoisImposto;

        BigDecimal restante = maxZero(recebido.subtract(imposto).subtract(comissao));
        BigDecimal totalSplit = empresaPct.add(socioPct);
        BigDecimal empresaValor = BigDecimal.ZERO;
        BigDecimal socioValor = BigDecimal.ZERO;
        if (totalSplit.signum() > 0) {
            empresaValor = moeda(restante.multiply(empresaPct).divide(totalSplit, 8, RoundingMode.HALF_UP));
            socioValor = moeda(restante.subtract(empresaValor));
        }

        Movimento mov = new Movimento();
        mov.setEmpresaId(ctx.empresaId());
        mov.setParcelaId(parcela.getId());
        mov.setVendaId(venda.getId());
        mov.setEmpreendimentoId(parcela.getEmpreendimentoId());
        mov.setUnidadeId(parcela.getUnidadeId());
        mov.setClienteId(parcela.getClienteId());
        mov.setCorretorNome(venda.getCorretorNome());
        mov.setOrigem(parcela.getOrigemTipo());
        mov.setOrigemDescricao(parcela.getOrigemDescricao());
        mov.setDataMovimento(data);
        mov.setUsuarioId(ctx.usuarioId());
        mov.setValorRecebido(recebido);
        mov.setImpostoReservado(imposto);
        mov.setComissaoPaga(comissao);
        mov.setEmpresaValor(empresaValor);
        mov.setSocioValor(socioValor);
        mov.setAliquotaTributariaAplicada(aliquota);
        mov.setEmpresaPctAplicada(empresaPct);
        mov.setSocioPctAplicada(socioPct);
        mov.setComissaoBaseCalculo(baseComissao);
        mov.setComissaoRepassePctAplicado(venda.getRepasseComissaoPct());
        mov.setComissaoSobreAcrescimosAplicada(venda.isComissaoSobreAcrescimos());
        mov.setAcrescimosRecebidos(acrescimos);
        mov.setComissaoTeorica(comissaoTeorica);
        mov.setSaldoComissaoApos(maxZero(saldoComissaoAntes.subtract(comissao)));
        Movimento salvo = movimentos.saveAndFlush(mov);

        parcela.setValorPago(recebido);
        parcela.setDataPagamento(data);
        parcela.setStatus("paga");
        parcelas.saveAndFlush(parcela);

        boolean faltaPagar = parcelas.findAllByEmpresaIdAndVendaIdOrderByVencimentoAscIdAsc(
                        ctx.empresaId(), venda.getId()
                )
                .stream()
                .anyMatch(p -> !"paga".equalsIgnoreCase(p.getStatus())
                        && !"cancelada".equalsIgnoreCase(p.getStatus()));
        if (!faltaPagar) {
            venda.setStatus("quitada");
            venda.setAtualizadoPorUsuarioId(ctx.usuarioId());
            vendas.saveAndFlush(venda);
        }

        registrar(ctx, "PARCELA", parcela.getId(), "RECEBIMENTO");
        return toMovimentoResponse(ctx.empresaId(), salvo);
    }

    @Transactional
    public void reverterRecebimento(
            Authentication auth, Long empresaSolicitada, Long parcelaId
    ) {
        var ctx = tenants.resolver(auth, empresaSolicitada);
        Parcela parcela = parcela(ctx.empresaId(), parcelaId);
        Movimento mov = movimentos
                .findFirstByEmpresaIdAndParcelaIdAndEstornadoFalseOrderByIdDesc(
                        ctx.empresaId(), parcelaId
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Nenhum recebimento ativo encontrado"
                ));

        mov.setEstornado(true);
        mov.setEstornadoEm(LocalDateTime.now());
        mov.setEstornadoPorUsuarioId(ctx.usuarioId());
        movimentos.saveAndFlush(mov);

        parcela.setValorPago(BigDecimal.ZERO);
        parcela.setDataPagamento(null);
        parcela.setStatus(LocalDate.now().isAfter(parcela.getVencimento()) ? "vencida" : "pendente");
        parcelas.saveAndFlush(parcela);

        Venda venda = venda(ctx.empresaId(), parcela.getVendaId());
        if ("quitada".equalsIgnoreCase(venda.getStatus())) {
            venda.setStatus("ativa");
            venda.setAtualizadoPorUsuarioId(ctx.usuarioId());
            vendas.saveAndFlush(venda);
        }

        registrar(ctx, "PARCELA", parcela.getId(), "RECEBIMENTO_ESTORNADO");
    }

    private void criarComposicaoEParcelas(
            Long empresaId,
            Venda venda,
            List<VendaRequest.PagamentoRequest> itens,
            JsonNode regras
    ) {
        JsonNode inadimplencia = regras.path("inadimplencia");
        String inadJson = inadimplencia.isMissingNode() || inadimplencia.isNull()
                ? null
                : escrever(inadimplencia);

        long ajusteRestanteCentavos = centavos(
                moeda(venda.getValorTotal()).subtract(totalComposicao(itens))
        );
        int parcelasAjustaveisRestantes = quantidadeParcelasAjustaveis(itens);

        for (var item : itens) {
            PagamentoItem p = new PagamentoItem();
            p.setEmpresaId(empresaId);
            p.setVendaId(venda.getId());
            p.setTipo(item.tipo());
            p.setDescricao(texto(item.descricao()));
            p.setValor(moeda(item.valor()));
            p.setParcelas(item.parcelas());
            p.setPrimeiroVencimento(item.primeiroVencimento());
            p.setStatus(texto(item.status()) == null ? "pendente" : item.status());
            pagamentos.save(p);

            if ("bem".equalsIgnoreCase(item.tipo())) continue;
            boolean itemParcelado = parcelado(item.tipo());
            int quantidade = itemParcelado ? Math.max(1, item.parcelas()) : 1;

            for (int numero = 1; numero <= quantidade; numero++) {
                BigDecimal valorParcela = moeda(item.valor());

                if (itemParcelado) {
                    long moduloAjuste = Math.abs(ajusteRestanteCentavos);
                    if (moduloAjuste > 0 && moduloAjuste >= parcelasAjustaveisRestantes) {
                        long passo = ajusteRestanteCentavos > 0 ? 1L : -1L;
                        valorParcela = moeda(valorParcela.add(BigDecimal.valueOf(passo, 2)));
                        ajusteRestanteCentavos -= passo;
                    }
                    parcelasAjustaveisRestantes--;
                }

                Parcela parcela = new Parcela();
                parcela.setEmpresaId(empresaId);
                parcela.setVendaId(venda.getId());
                parcela.setEmpreendimentoId(venda.getEmpreendimentoId());
                parcela.setUnidadeId(venda.getUnidadeId());
                parcela.setClienteId(venda.getClienteId());
                parcela.setOrigemTipo(item.tipo());
                parcela.setOrigemDescricao(texto(item.descricao()) == null ? item.tipo() : item.descricao());
                parcela.setNumero(numero);
                parcela.setTotalParcelas(quantidade);
                parcela.setVencimento(item.primeiroVencimento().plusMonths(numero - 1L));
                parcela.setValor(valorParcela);
                parcela.setValorPago(BigDecimal.ZERO);
                parcela.setStatus("pendente");
                parcela.setRegrasInadimplenciaJson(inadJson);
                parcelas.save(parcela);
            }
        }
        pagamentos.flush();
        parcelas.flush();
    }

    private boolean mesmaComposicao(
            Long empresaId, Long vendaId, List<VendaRequest.PagamentoRequest> nova
    ) {
        List<PagamentoItem> atual =
                pagamentos.findAllByEmpresaIdAndVendaIdOrderByIdAsc(empresaId, vendaId);
        if (atual.size() != nova.size()) return false;
        for (int i = 0; i < atual.size(); i++) {
            PagamentoItem a = atual.get(i);
            VendaRequest.PagamentoRequest n = nova.get(i);
            if (!a.getTipo().equals(n.tipo())
                    || a.getValor().compareTo(moeda(n.valor())) != 0
                    || !Objects.equals(a.getParcelas(), n.parcelas())
                    || !Objects.equals(a.getPrimeiroVencimento(), n.primeiroVencimento())
                    || !Objects.equals(texto(a.getDescricao()), texto(n.descricao()))) {
                return false;
            }
        }
        return true;
    }

    private void validarComposicao(VendaRequest body) {
        BigDecimal diferenca = moeda(body.valorTotal()).subtract(totalComposicao(body.composicao()));
        long diferencaCentavos = Math.abs(centavos(diferenca));

        if (diferencaCentavos == 0) return;

        int parcelasAjustaveis = quantidadeParcelasAjustaveis(body.composicao());
        long limiteArredondamento = Math.max(1L, (parcelasAjustaveis + 1L) / 2L);

        if (parcelasAjustaveis == 0 || diferencaCentavos > limiteArredondamento) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A composição do pagamento não fecha com o valor negociado"
            );
        }
    }

    private BigDecimal totalComposicao(List<VendaRequest.PagamentoRequest> itens) {
        BigDecimal total = BigDecimal.ZERO;
        for (var item : itens) {
            int qtd = parcelado(item.tipo()) ? Math.max(1, item.parcelas()) : 1;
            total = total.add(moeda(item.valor()).multiply(BigDecimal.valueOf(qtd)));
        }
        return moeda(total);
    }

    private int quantidadeParcelasAjustaveis(List<VendaRequest.PagamentoRequest> itens) {
        return itens.stream()
                .filter(item -> parcelado(item.tipo()))
                .mapToInt(item -> Math.max(1, item.parcelas()))
                .sum();
    }

    private long centavos(BigDecimal valor) {
        return moeda(valor).movePointRight(2).longValueExact();
    }

    private boolean parcelado(String tipo) {
        return "parcelas".equalsIgnoreCase(tipo) || "sinal_parcelado".equalsIgnoreCase(tipo);
    }

    private JsonNode regrasEfetivas(Empreendimento emp, Unidade unidade) {
        if (texto(unidade.getRegrasJson()) != null) return ler(unidade.getRegrasJson());
        if (unidade.getQuadraId() != null) {
            Quadra q = quadras.findByIdAndEmpresaId(unidade.getQuadraId(), emp.getEmpresaId()).orElse(null);
            if (q != null && texto(q.getRegrasJson()) != null) return ler(q.getRegrasJson());
        }

        ObjectNode node = json.createObjectNode();
        node.put("aliquotaTributaria", emp.getAliquotaTributaria());
        node.put("socioPct", emp.getSocioPct());
        node.put("empresaPct", emp.getEmpresaPct());
        node.put("corretorPct", emp.getCorretorPct());
        node.put("repasseComissaoPct", emp.getRepasseComissaoPct());
        node.put("comissaoSobreAcrescimos", emp.isComissaoSobreAcrescimos());
        if (texto(emp.getInadimplenciaJson()) != null) {
            node.set("inadimplencia", ler(emp.getInadimplenciaJson()));
        }
        return node;
    }

    private BigDecimal valorCorrigido(Parcela parcela, LocalDate data) {
        BigDecimal base = parcela.getValor();
        if (data == null || !data.isAfter(parcela.getVencimento())) return base;

        JsonNode r = regrasInadimplenciaAtuais(parcela);
        long diasAtraso = Math.max(0, ChronoUnit.DAYS.between(parcela.getVencimento(), data));
        boolean toleranciaAtiva = bool(r, "toleranciaAtiva", false);
        long tolerancia = toleranciaAtiva ? inteiro(r, "diasTolerancia", 0) : 0;
        long diasEfetivos;
        if (diasAtraso <= tolerancia) {
            diasEfetivos = 0;
        } else if ("vencimento".equals(textoJson(r, "inicioJuros", "vencimento"))) {
            diasEfetivos = diasAtraso;
        } else {
            diasEfetivos = diasAtraso - tolerancia;
        }

        BigDecimal meses = BigDecimal.valueOf(diasEfetivos)
                .divide(TRINTA, 8, RoundingMode.HALF_UP);
        BigDecimal correcao = bool(r, "correcaoAtiva", false)
                ? porcentagem(base, decimal(r, "correcaoPctMes", BigDecimal.ZERO)).multiply(meses)
                : BigDecimal.ZERO;

        BigDecimal juros = BigDecimal.ZERO;
        if (bool(r, "jurosAtivo", false)) {
            if ("diario".equals(textoJson(r, "jurosTipo", "mensal"))) {
                juros = porcentagem(base, decimal(r, "jurosPctDia", BigDecimal.ZERO))
                        .multiply(BigDecimal.valueOf(diasEfetivos));
            } else {
                juros = porcentagem(base, decimal(r, "jurosPctMes", BigDecimal.ZERO))
                        .multiply(meses);
            }
        }

        BigDecimal mora = bool(r, "moraAtiva", false) && diasEfetivos > 0
                ? porcentagem(base, decimal(r, "moraPct", BigDecimal.ZERO))
                : BigDecimal.ZERO;

        return moeda(base.add(correcao).add(juros).add(mora));
    }

    private VendaResponse toVendaResponse(Long empresaId, Venda v) {
        Cliente cliente = cliente(empresaId, v.getClienteId());
        List<VendaResponse.PagamentoResponse> composicao =
                pagamentos.findAllByEmpresaIdAndVendaIdOrderByIdAsc(empresaId, v.getId())
                        .stream()
                        .map(p -> new VendaResponse.PagamentoResponse(
                                p.getId(), p.getTipo(), p.getDescricao(), p.getValor(),
                                p.getParcelas(), p.getPrimeiroVencimento(), p.getStatus()
                        ))
                        .toList();

        return new VendaResponse(
                v.getId(), v.getEmpresaId(), v.getEmpreendimentoId(), v.getUnidadeId(),
                v.getClienteId(), cliente.getNome(), v.getValorTotal(), v.getDataContrato(),
                v.getCorretorNome(), v.getCorretorPct(), v.getRepasseComissaoPct(),
                v.isComissaoSobreAcrescimos(), v.getObservacoes(), v.getStatus(),
                ler(v.getRegrasJson()), v.getVersao(), composicao
        );
    }

    private ParcelaResponse toParcelaResponse(Long empresaId, Parcela p) {
        Cliente cliente = cliente(empresaId, p.getClienteId());
        return new ParcelaResponse(
                p.getId(), p.getVendaId(), p.getEmpreendimentoId(), p.getUnidadeId(),
                p.getClienteId(), cliente.getNome(), p.getOrigemTipo(), p.getOrigemDescricao(),
                p.getNumero(), p.getTotalParcelas(), p.getVencimento(), p.getValor(),
                p.getValorPago(), p.getDataPagamento(), p.getStatus(),
                regrasInadimplenciaAtuais(p), p.getVersao()
        );
    }

    private JsonNode regrasInadimplenciaAtuais(Parcela parcela) {
        if (("paga".equalsIgnoreCase(parcela.getStatus())
                || "cancelada".equalsIgnoreCase(parcela.getStatus()))
                && texto(parcela.getRegrasInadimplenciaJson()) != null) {
            return ler(parcela.getRegrasInadimplenciaJson());
        }

        Venda venda = venda(parcela.getEmpresaId(), parcela.getVendaId());
        JsonNode inadimplencia = ler(venda.getRegrasJson()).path("inadimplencia");
        if (inadimplencia.isMissingNode() || inadimplencia.isNull()) {
            return json.createObjectNode();
        }
        return inadimplencia;
    }

    private JsonNode aplicarInadimplencia(JsonNode regrasBase, JsonNode regrasInadimplencia) {
        ObjectNode regras = regrasBase != null && regrasBase.isObject()
                ? (ObjectNode) regrasBase.deepCopy()
                : json.createObjectNode();

        if (regrasInadimplencia == null || regrasInadimplencia.isNull()) {
            return regras;
        }
        validarInadimplencia(regrasInadimplencia);
        regras.set("inadimplencia", regrasInadimplencia.deepCopy());
        return regras;
    }

    private void validarInadimplencia(JsonNode regras) {
        if (!regras.isObject()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "A regra de juros e correção da venda é inválida"
            );
        }

        validarPercentualNaoNegativo(regras, "correcaoPctMes");
        validarPercentualNaoNegativo(regras, "jurosPctMes");
        validarPercentualNaoNegativo(regras, "jurosPctDia");
        validarPercentualNaoNegativo(regras, "moraPct");

        if (regras.has("diasTolerancia") && regras.path("diasTolerancia").asLong() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dias de tolerância inválidos");
        }

        String jurosTipo = textoJson(regras, "jurosTipo", "mensal");
        if (!"mensal".equals(jurosTipo) && !"diario".equals(jurosTipo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Periodicidade de juros inválida");
        }

        String inicioJuros = textoJson(regras, "inicioJuros", "apos_tolerancia");
        if (!"vencimento".equals(inicioJuros) && !"apos_tolerancia".equals(inicioJuros)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Início dos juros inválido");
        }
    }

    private void validarPercentualNaoNegativo(JsonNode regras, String campo) {
        JsonNode valor = regras.path(campo);
        if (!valor.isMissingNode() && !valor.isNull() && valor.decimalValue().signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Percentual de atraso inválido");
        }
    }

    private void atualizarRegrasParcelasAbertas(Long empresaId, Long vendaId, JsonNode regras) {
        JsonNode inadimplencia = regras.path("inadimplencia");
        String inadJson = inadimplencia.isMissingNode() || inadimplencia.isNull()
                ? null
                : escrever(inadimplencia);

        List<Parcela> abertas = parcelas.findAllByEmpresaIdAndVendaIdOrderByVencimentoAscIdAsc(
                        empresaId,
                        vendaId
                )
                .stream()
                .filter(p -> !"paga".equalsIgnoreCase(p.getStatus())
                        && !"cancelada".equalsIgnoreCase(p.getStatus()))
                .toList();

        for (Parcela parcela : abertas) {
            parcela.setRegrasInadimplenciaJson(inadJson);
        }
        parcelas.saveAll(abertas);
        parcelas.flush();
    }

    private MovimentoResponse toMovimentoResponse(Long empresaId, Movimento m) {
        Cliente cliente = cliente(empresaId, m.getClienteId());
        String usuario = usuarios.findById(m.getUsuarioId())
                .map(u -> u.getNome())
                .orElse("Usuário");
        return new MovimentoResponse(
                m.getId(), m.getParcelaId(), m.getVendaId(), m.getEmpreendimentoId(),
                m.getUnidadeId(), m.getClienteId(), cliente.getNome(), m.getCorretorNome(),
                m.getOrigem(), m.getOrigemDescricao(), m.getDataMovimento(), usuario,
                m.getValorRecebido(), m.getImpostoReservado(), m.getComissaoPaga(),
                m.getEmpresaValor(), m.getSocioValor(), m.getAliquotaTributariaAplicada(),
                m.getEmpresaPctAplicada(), m.getSocioPctAplicada(), m.getComissaoBaseCalculo(),
                m.getComissaoRepassePctAplicado(), m.getComissaoSobreAcrescimosAplicada(),
                m.getAcrescimosRecebidos(), m.getComissaoTeorica(), m.getSaldoComissaoApos()
        );
    }

    private Venda venda(Long empresaId, Long id) {
        return vendas.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Venda não encontrada"));
    }

    private Parcela parcela(Long empresaId, Long id) {
        return parcelas.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parcela não encontrada"));
    }

    private Empreendimento empreendimento(Long empresaId, Long id) {
        return empreendimentos.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empreendimento não encontrado"));
    }

    private Unidade unidade(Long empresaId, Long id) {
        return unidades.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unidade não encontrada"));
    }

    private Cliente cliente(Long empresaId, Long id) {
        return clientes.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cliente não encontrado"));
    }

    private void exigirVersao(Long recebida, Long atual) {
        if (recebida == null || !Objects.equals(recebida, atual)) {
            throw new ResponseStatusException(
                    recebida == null ? HttpStatus.BAD_REQUEST : HttpStatus.CONFLICT,
                    recebida == null
                            ? "Informe a versão atual da venda"
                            : "A venda foi alterada por outro usuário. Atualize a tela."
            );
        }
    }

    private BigDecimal percentual(BigDecimal valor) {
        if (valor == null || valor.signum() < 0 || valor.compareTo(CEM) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Percentual inválido");
        }
        return valor;
    }

    private BigDecimal porcentagem(BigDecimal base, BigDecimal pct) {
        return moeda(base.multiply(pct).divide(CEM, 8, RoundingMode.HALF_UP));
    }

    private BigDecimal moeda(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal maxZero(BigDecimal valor) {
        return valor.signum() < 0 ? BigDecimal.ZERO.setScale(2) : moeda(valor);
    }

    private String texto(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private JsonNode ler(String valor) {
        try {
            return json.readTree(valor);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Regra financeira inválida", e);
        }
    }

    private JsonNode lerOuVazio(String valor) {
        return texto(valor) == null ? json.createObjectNode() : ler(valor);
    }

    private String escrever(JsonNode valor) {
        try {
            return json.writeValueAsString(valor);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Falha ao registrar regra financeira", e);
        }
    }

    private BigDecimal decimal(JsonNode node, String campo, BigDecimal padrao) {
        JsonNode n = node.path(campo);
        return n.isMissingNode() || n.isNull() ? padrao : n.decimalValue();
    }

    private boolean bool(JsonNode node, String campo, boolean padrao) {
        JsonNode n = node.path(campo);
        return n.isMissingNode() || n.isNull() ? padrao : n.asBoolean();
    }

    private long inteiro(JsonNode node, String campo, long padrao) {
        JsonNode n = node.path(campo);
        return n.isMissingNode() || n.isNull() ? padrao : n.asLong();
    }

    private String textoJson(JsonNode node, String campo, String padrao) {
        JsonNode n = node.path(campo);
        return n.isMissingNode() || n.isNull() ? padrao : n.asText();
    }

    private String descreverAlteracoesVenda(
            Long empresaId,
            Venda atual,
            VendaRequest body,
            Cliente clienteAtualizado,
            JsonNode regrasAtuais,
            JsonNode regrasAtualizadas,
            boolean composicaoAlterada
    ) {
        List<String> alteracoes = new ArrayList<>();

        if (!Objects.equals(atual.getClienteId(), body.clienteId())) {
            String clienteAnterior = clientes.findById(atual.getClienteId())
                    .map(Cliente::getNome)
                    .orElse("Cliente #" + atual.getClienteId());
            alteracoes.add("Cliente: " + clienteAnterior + " → " + clienteAtualizado.getNome());
        }

        BigDecimal novoValor = moeda(body.valorTotal());
        if (atual.getValorTotal().compareTo(novoValor) != 0) {
            alteracoes.add("Valor da venda: " + dinheiro(atual.getValorTotal()) + " → " + dinheiro(novoValor));
        }

        if (!Objects.equals(atual.getDataContrato(), body.dataContrato())) {
            alteracoes.add(
                    "Data do contrato: " + dataLegivel(atual.getDataContrato())
                            + " → " + dataLegivel(body.dataContrato())
            );
        }

        String corretorAnterior = texto(atual.getCorretorNome());
        String corretorNovo = texto(body.corretorNome());
        if (!Objects.equals(corretorAnterior, corretorNovo)) {
            alteracoes.add("Corretor: " + textoLegivel(corretorAnterior) + " → " + textoLegivel(corretorNovo));
        }

        BigDecimal comissaoNova = percentual(body.corretorPct());
        if (atual.getCorretorPct().compareTo(comissaoNova) != 0) {
            alteracoes.add("Comissão total: " + percentualLegivel(atual.getCorretorPct())
                    + " → " + percentualLegivel(comissaoNova));
        }

        BigDecimal repasseNovo = percentual(body.repasseComissaoPct());
        if (atual.getRepasseComissaoPct().compareTo(repasseNovo) != 0) {
            alteracoes.add("Repasse por recebimento: " + percentualLegivel(atual.getRepasseComissaoPct())
                    + " → " + percentualLegivel(repasseNovo));
        }

        if (atual.isComissaoSobreAcrescimos() != body.comissaoSobreAcrescimos()) {
            alteracoes.add(
                    "Comissão sobre acréscimos: "
                            + simNao(atual.isComissaoSobreAcrescimos())
                            + " → " + simNao(body.comissaoSobreAcrescimos())
            );
        }

        String observacaoAnterior = texto(atual.getObservacoes());
        String observacaoNova = texto(body.observacoes());
        if (!Objects.equals(observacaoAnterior, observacaoNova)) {
            alteracoes.add("Observações: " + textoLegivel(observacaoAnterior) + " → " + textoLegivel(observacaoNova));
        }

        if (!Objects.equals(
                regrasAtuais.path("inadimplencia"),
                regrasAtualizadas.path("inadimplencia")
        )) {
            alteracoes.add("Regras de juros, correção, multa ou tolerância foram alteradas.");
        }

        if (composicaoAlterada) {
            alteracoes.add(
                    "Composição do pagamento: "
                            + resumoComposicaoAtual(empresaId, atual.getId())
                            + " → " + resumoComposicaoNova(body.composicao())
            );
        }

        return String.join("\n", alteracoes);
    }

    private String resumoComposicaoAtual(Long empresaId, Long vendaId) {
        return pagamentos.findAllByEmpresaIdAndVendaIdOrderByIdAsc(empresaId, vendaId)
                .stream()
                .map(item -> resumoPagamento(
                        item.getTipo(),
                        item.getDescricao(),
                        item.getValor(),
                        item.getParcelas(),
                        item.getPrimeiroVencimento()
                ))
                .reduce((a, b) -> a + "; " + b)
                .orElse("sem composição");
    }

    private String resumoComposicaoNova(List<VendaRequest.PagamentoRequest> itens) {
        return itens.stream()
                .map(item -> resumoPagamento(
                        item.tipo(),
                        item.descricao(),
                        moeda(item.valor()),
                        item.parcelas(),
                        item.primeiroVencimento()
                ))
                .reduce((a, b) -> a + "; " + b)
                .orElse("sem composição");
    }

    private String resumoPagamento(
            String tipo,
            String descricao,
            BigDecimal valor,
            Integer parcelasQuantidade,
            LocalDate vencimento
    ) {
        int quantidade = parcelado(tipo) ? Math.max(1, parcelasQuantidade == null ? 1 : parcelasQuantidade) : 1;
        String nome = texto(descricao) == null ? tipo : descricao.trim();
        return nome + " · " + quantidade + "x " + dinheiro(valor)
                + " · início " + dataLegivel(vencimento);
    }

    private String dinheiro(BigDecimal valor) {
        if (valor == null) return "—";
        return "R$ " + moeda(valor).toPlainString().replace('.', ',');
    }

    private String percentualLegivel(BigDecimal valor) {
        if (valor == null) return "0%";
        return valor.stripTrailingZeros().toPlainString().replace('.', ',') + "%";
    }

    private String dataLegivel(LocalDate data) {
        return data == null ? "—" : data.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private String textoLegivel(String valor) {
        return texto(valor) == null ? "—" : valor.trim();
    }

    private String simNao(boolean valor) {
        return valor ? "Sim" : "Não";
    }

    private void registrar(
            TenantContextService.Contexto ctx, String entidade, Long entidadeId, String acao
    ) {
        registrar(ctx, entidade, entidadeId, acao, null);
    }

    private void registrar(
            TenantContextService.Contexto ctx,
            String entidade,
            Long entidadeId,
            String acao,
            String detalhes
    ) {
        auditoria.save(new AuditoriaOperacional(
                ctx.empresaId(), ctx.usuarioId(), entidade, entidadeId, acao, detalhes
        ));
    }
}
