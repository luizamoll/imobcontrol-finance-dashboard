package br.com.imobcontrol.fechamento;

import br.com.imobcontrol.cliente.Cliente;
import br.com.imobcontrol.cliente.ClienteRepository;
import br.com.imobcontrol.financeiro.Movimento;
import br.com.imobcontrol.financeiro.MovimentoRepository;
import br.com.imobcontrol.financeiro.Parcela;
import br.com.imobcontrol.financeiro.ParcelaRepository;
import br.com.imobcontrol.financeiro.Venda;
import br.com.imobcontrol.financeiro.VendaRepository;
import br.com.imobcontrol.operacao.EmpreendimentoRepository;
import br.com.imobcontrol.operacao.Unidade;
import br.com.imobcontrol.operacao.UnidadeRepository;
import br.com.imobcontrol.tenant.TenantContextService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Comparator;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class FechamentoMensalService {
    private static final Set<String> TIPOS = Set.of(
        "CUSTO_EMPREENDIMENTO", "IMPOSTO_PAGO", "DISTRATO_DEVOLUCAO",
        "RETENCAO", "OUTRA_RECEITA", "COMISSAO_PAGA",
        "REPASSE_SOCIO_PAGO", "REPASSE_EMPREENDEDOR_PAGO"
    );
    private static final BigDecimal ZERO = new BigDecimal("0.00");

    private final TenantContextService tenants;
    private final EmpreendimentoRepository empreendimentos;
    private final UnidadeRepository unidades;
    private final VendaRepository vendas;
    private final ParcelaRepository parcelas;
    private final MovimentoRepository movimentos;
    private final FechamentoLancamentoRepository lancamentos;
    private final ClienteRepository clientes;

    public FechamentoMensalService(
        TenantContextService tenants,
        EmpreendimentoRepository empreendimentos,
        UnidadeRepository unidades,
        VendaRepository vendas,
        ParcelaRepository parcelas,
        MovimentoRepository movimentos,
        FechamentoLancamentoRepository lancamentos,
        ClienteRepository clientes
    ) {
        this.tenants = tenants;
        this.empreendimentos = empreendimentos;
        this.unidades = unidades;
        this.vendas = vendas;
        this.parcelas = parcelas;
        this.movimentos = movimentos;
        this.lancamentos = lancamentos;
        this.clientes = clientes;
    }

    @Transactional(readOnly = true)
    public FechamentoMensalResponse consultar(
        Authentication auth, Long empresaId, String mes, Long empreendimentoId
    ) {
        var ctx = tenants.resolver(auth, empresaId);
        var periodo = periodo(mes);
        LocalDate inicio = periodo.atDay(1);
        LocalDate fim = periodo.atEndOfMonth();
        if (empreendimentoId != null) exigirEmpreendimento(ctx.empresaId(), empreendimentoId);

        List<Movimento> todosMovimentos = movimentos
            .findAllByEmpresaIdAndEstornadoFalseOrderByDataMovimentoDescIdDesc(ctx.empresaId());
        var filtrados = todosMovimentos.stream()
            .filter(m -> !m.getDataMovimento().isBefore(inicio) && !m.getDataMovimento().isAfter(fim))
            .filter(m -> empreendimentoId == null || empreendimentoId.equals(m.getEmpreendimentoId()))
            .toList();

        BigDecimal recebidoParcelas = somaMovimentos(filtrados, Movimento::getValorRecebido);
        BigDecimal valorSocio = somaMovimentos(filtrados, Movimento::getSocioValor);
        BigDecimal valorEmpreendedor = somaMovimentos(filtrados, Movimento::getEmpresaValor);
        BigDecimal impostoReservado = somaMovimentos(filtrados, Movimento::getImpostoReservado);
        BigDecimal comissaoRegistrada = somaMovimentos(filtrados, Movimento::getComissaoPaga);

        List<FechamentoLancamento> lancamentosMes = lancamentos
            .findAllByEmpresaIdAndDataLancamentoBetweenOrderByDataLancamentoAscIdAsc(
                ctx.empresaId(), inicio, fim
            ).stream()
            .filter(l -> empreendimentoId == null || empreendimentoId.equals(l.getEmpreendimentoId()))
            .toList();

        BigDecimal outrasReceitas = somaLancamentos(lancamentosMes, "OUTRA_RECEITA");
        BigDecimal custo = somaLancamentos(lancamentosMes, "CUSTO_EMPREENDIMENTO");
        BigDecimal impostoPago = somaLancamentos(lancamentosMes, "IMPOSTO_PAGO");
        BigDecimal devolvido = somaLancamentos(lancamentosMes, "DISTRATO_DEVOLUCAO");
        BigDecimal retido = somaLancamentos(lancamentosMes, "RETENCAO");
        BigDecimal comissaoEfetivamentePaga = somaLancamentos(lancamentosMes, "COMISSAO_PAGA");
        BigDecimal socioEfetivamentePago = somaLancamentos(lancamentosMes, "REPASSE_SOCIO_PAGO");
        BigDecimal empreendedorEfetivamentePago = somaLancamentos(lancamentosMes, "REPASSE_EMPREENDEDOR_PAGO");

        // Só movimentações reais do período entram no total recebido.
        // Retenções são reservas, não saídas de caixa: subtraímos apenas do disponível.
        BigDecimal totalRecebido = recebidoParcelas.add(outrasReceitas);
        BigDecimal disponivel = totalRecebido
            .subtract(custo).subtract(impostoPago).subtract(devolvido).subtract(retido)
            .subtract(comissaoEfetivamentePaga).subtract(socioEfetivamentePago)
            .subtract(empreendedorEfetivamentePago);

        List<Venda> vendasAtivas = vendas.findAllByEmpresaId(ctx.empresaId()).stream()
            // Também considerar vendas quitadas: elas podem ter pago no mês.
            .filter(v -> "ativa".equalsIgnoreCase(v.getStatus())
                || "quitada".equalsIgnoreCase(v.getStatus()))
            .filter(v -> !v.getDataContrato().isAfter(fim))
            .filter(v -> empreendimentoId == null || empreendimentoId.equals(v.getEmpreendimentoId()))
            .toList();

        // Abrange todas as unidades com contrato, inclusive cadastros legados sem tipo.
        Map<Long, Unidade> unidadesPorId = unidades.findAllByEmpresaId(ctx.empresaId()).stream()
            .collect(Collectors.toMap(Unidade::getId, Function.identity()));
        Map<Long, String> clientesPorId = clientes.findAllByEmpresaId(ctx.empresaId()).stream()
            .collect(Collectors.toMap(Cliente::getId, Cliente::getNome));

        List<Parcela> todasParcelas = parcelas.findAllByEmpresaIdOrderByVencimentoAscIdAsc(ctx.empresaId());
        Map<Long, List<Parcela>> parcelasPorVenda = todasParcelas.stream()
            .collect(Collectors.groupingBy(Parcela::getVendaId));
        Map<Long, BigDecimal> recebidoPorParcelaAteFim = todosMovimentos.stream()
            .filter(m -> !m.getDataMovimento().isAfter(fim))
            .collect(Collectors.groupingBy(
                Movimento::getParcelaId,
                Collectors.reducing(ZERO, Movimento::getValorRecebido, BigDecimal::add)
            ));
        Map<Long, List<Movimento>> movimentosPorUnidade = filtrados.stream()
            .collect(Collectors.groupingBy(Movimento::getUnidadeId));

        // Uma linha para cada unidade/gleba, indicando pagamento no mês e adimplência
        // na data de corte, que são conceitos distintos.
        List<FechamentoMensalResponse.UnidadeFechamento> unidadesFechamento = vendasAtivas.stream()
            .filter(v -> unidadesPorId.containsKey(v.getUnidadeId()))
            .collect(Collectors.toMap(Venda::getUnidadeId, Function.identity(),
                (anterior, atual) -> anterior.getId() > atual.getId() ? anterior : atual))
            .values().stream()
            .map(v -> {
                Unidade unidade = unidadesPorId.get(v.getUnidadeId());
                List<Movimento> movs = movimentosPorUnidade.getOrDefault(v.getUnidadeId(), List.of());
                BigDecimal saldoVencido = parcelasPorVenda.getOrDefault(v.getId(), List.of()).stream()
                    .filter(p -> !p.getVencimento().isAfter(fim))
                    .filter(p -> !"cancelada".equalsIgnoreCase(p.getStatus())
                        && !"em_acordo".equalsIgnoreCase(p.getStatus())
                        && !"original".equalsIgnoreCase(p.getAcordoPapel()))
                    .map(p -> p.getValor().subtract(
                        recebidoPorParcelaAteFim.getOrDefault(p.getId(), ZERO)).max(ZERO))
                    .reduce(ZERO, BigDecimal::add);
                BigDecimal recebidoMes = somaMovimentos(movs, Movimento::getValorRecebido);
                LocalDate ultimo = movs.stream().map(Movimento::getDataMovimento)
                    .max(LocalDate::compareTo).orElse(null);
                return new FechamentoMensalResponse.UnidadeFechamento(
                    unidade.getId(),
                    unidade.getUnidade() == null || unidade.getUnidade().isBlank()
                        ? unidade.getNumero() : unidade.getUnidade(),
                    clientesPorId.getOrDefault(v.getClienteId(), "Cliente não localizado"),
                    recebidoMes.compareTo(ZERO) > 0,
                    saldoVencido.compareTo(ZERO) > 0,
                    recebidoMes, saldoVencido, ultimo
                );
            })
            .sorted(Comparator.comparing(FechamentoMensalResponse.UnidadeFechamento::unidade))
            .toList();

        int inadimplentes = (int) unidadesFechamento.stream()
            .filter(FechamentoMensalResponse.UnidadeFechamento::inadimplenteNoFim).count();
        int adimplentes = unidadesFechamento.size() - inadimplentes;
        int pagaramMes = (int) unidadesFechamento.stream()
            .filter(FechamentoMensalResponse.UnidadeFechamento::pagouNoMes).count();

        var detalhes = lancamentosMes.stream()
            .map(l -> new FechamentoMensalResponse.Lancamento(
                l.getId(), l.getEmpreendimentoId(), l.getDataLancamento(),
                l.getTipo(), l.getDescricao(), l.getValor(),
                l.getEstornadoEm() != null, l.getCriadoEm()
            ))
            .toList();

        return new FechamentoMensalResponse(
            mes, empreendimentoId,
            unidadesFechamento.size(), adimplentes, inadimplentes, pagaramMes,
            recebidoParcelas, outrasReceitas, totalRecebido,
            custo, valorSocio, valorEmpreendedor, impostoReservado,
            impostoPago, comissaoRegistrada, comissaoEfetivamentePaga,
            socioEfetivamentePago, empreendedorEfetivamentePago,
            devolvido, retido, disponivel, detalhes, unidadesFechamento
        );
    }

    @Transactional
    public FechamentoMensalResponse.Lancamento cadastrar(
        Authentication auth, Long empresaId, FechamentoLancamentoRequest body
    ) {
        var ctx = tenants.resolver(auth, empresaId);
        exigirEmpreendimento(ctx.empresaId(), body.empreendimentoId());
        if (!TIPOS.contains(body.tipo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de lançamento não permitido");
        }
        if (body.valor().scale() > 2 || body.valor().compareTo(ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe valor positivo com até duas casas decimais");
        }
        if (body.data().isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A data do lançamento não pode estar no futuro");
        }
        var novo = new FechamentoLancamento();
        novo.setEmpresaId(ctx.empresaId());
        novo.setEmpreendimentoId(body.empreendimentoId());
        novo.setDataLancamento(body.data());
        novo.setTipo(body.tipo());
        novo.setDescricao(body.descricao().trim());
        novo.setValor(body.valor().setScale(2, RoundingMode.UNNECESSARY));
        novo.setCriadoPorUsuarioId(ctx.usuarioId());
        var salvo = lancamentos.saveAndFlush(novo);
        return new FechamentoMensalResponse.Lancamento(
            salvo.getId(), salvo.getEmpreendimentoId(), salvo.getDataLancamento(),
            salvo.getTipo(), salvo.getDescricao(), salvo.getValor(), false, salvo.getCriadoEm()
        );
    }

    @Transactional
    public void estornar(Authentication auth, Long empresaId, Long id) {
        var ctx = tenants.resolver(auth, empresaId);
        var lancamento = lancamentos.findByIdAndEmpresaId(id, ctx.empresaId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (lancamento.getEstornadoEm() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Lançamento já estornado");
        }
        lancamento.setEstornadoPorUsuarioId(ctx.usuarioId());
        lancamento.setEstornadoEm(LocalDateTime.now());
        lancamentos.saveAndFlush(lancamento);
    }

    private void exigirEmpreendimento(Long empresaId, Long id) {
        empreendimentos.findByIdAndEmpresaId(id, empresaId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empreendimento não encontrado"));
    }

    static YearMonth periodo(String mes) {
        try {
            if (!mes.matches("\\d{4}-(0[1-9]|1[0-2])")) throw new DateTimeParseException("Mês inválido", mes, 0);
            return YearMonth.parse(mes);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mês inválido. Use AAAA-MM");
        }
    }

    private static BigDecimal somaMovimentos(List<Movimento> lista, Function<Movimento, BigDecimal> valor) {
        return lista.stream().map(valor).filter(v -> v != null).reduce(ZERO, BigDecimal::add);
    }

    private static BigDecimal somaLancamentos(List<FechamentoLancamento> lista, String tipo) {
        return lista.stream()
            .filter(l -> l.getEstornadoEm() == null && tipo.equals(l.getTipo()))
            .map(FechamentoLancamento::getValor)
            .reduce(ZERO, BigDecimal::add);
    }
}