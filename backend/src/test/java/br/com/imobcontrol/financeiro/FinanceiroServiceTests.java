package br.com.imobcontrol.financeiro;

import br.com.imobcontrol.cliente.Cliente;
import br.com.imobcontrol.cliente.ClienteRepository;
import br.com.imobcontrol.operacao.Empreendimento;
import br.com.imobcontrol.operacao.EmpreendimentoRepository;
import br.com.imobcontrol.operacao.Quadra;
import br.com.imobcontrol.operacao.QuadraRepository;
import br.com.imobcontrol.operacao.Unidade;
import br.com.imobcontrol.operacao.UnidadeRepository;
import br.com.imobcontrol.tenant.Empresa;
import br.com.imobcontrol.tenant.EmpresaRepository;
import br.com.imobcontrol.tenant.PerfilUsuario;
import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FinanceiroServiceTests {

    @Autowired FinanceiroService service;
    @Autowired EmpresaRepository empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired EmpreendimentoRepository empreendimentos;
    @Autowired QuadraRepository quadras;
    @Autowired UnidadeRepository unidades;
    @Autowired ClienteRepository clientes;
    @Autowired JsonMapper json;

    @Test
    void corretorRecebeMetadeDosPagamentosAteAtingirTetoDeCincoPorCento() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        Unidade unidade = criarUnidade(empresa, usuario, empreendimento);
        Cliente cliente = criarCliente(empresa, usuario);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        VendaResponse venda = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        "Corretor teste",
                        new BigDecimal("5"),
                        new BigDecimal("50"),
                        false,
                        null,
                        List.of(
                                new VendaRequest.PagamentoRequest(
                                        "sinal", "Entrada", new BigDecimal("4.00"),
                                        1, contrato, "pendente"
                                ),
                                new VendaRequest.PagamentoRequest(
                                        "parcelas", "Parcelas", new BigDecimal("24.00"),
                                        4, contrato.plusMonths(1), "pendente"
                                )
                        ),
                        null
                )
        );

        List<ParcelaResponse> parcelas = service.listarParcelas(autenticacao(usuario), null);
        ParcelaResponse entrada = parcelas.stream()
                .filter(p -> p.vendaId().equals(venda.id()) && p.origemTipo().equals("sinal"))
                .findFirst().orElseThrow();
        List<ParcelaResponse> mensais = parcelas.stream()
                .filter(p -> p.vendaId().equals(venda.id()) && p.origemTipo().equals("parcelas"))
                .toList();

        MovimentoResponse primeiro = service.receber(
                autenticacao(usuario), null, entrada.id(),
                new RecebimentoRequest(new BigDecimal("4.00"), contrato)
        );
        MovimentoResponse segundo = service.receber(
                autenticacao(usuario), null, mensais.get(0).id(),
                new RecebimentoRequest(new BigDecimal("24.00"), contrato.plusMonths(1))
        );
        MovimentoResponse terceiro = service.receber(
                autenticacao(usuario), null, mensais.get(1).id(),
                new RecebimentoRequest(new BigDecimal("24.00"), contrato.plusMonths(2))
        );

        assertDinheiro("2.00", primeiro.comissaoPaga());
        assertDinheiro("3.00", segundo.comissaoPaga());
        assertDinheiro("0.00", terceiro.comissaoPaga());
        assertDinheiro("3.00", primeiro.saldoComissaoApos());
        assertDinheiro("0.00", segundo.saldoComissaoApos());
        assertDinheiro("0.00", terceiro.saldoComissaoApos());
        assertDinheiro("50.00", primeiro.comissaoRepassePctAplicado());
    }

    @Test
    void editaVendaJaCadastradaAntesDeRecebimentos() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        Unidade unidade = criarUnidade(empresa, usuario, empreendimento);
        Cliente cliente = criarCliente(empresa, usuario);
        Cliente novoCliente = criarCliente(empresa, usuario);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        VendaResponse venda = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        "Corretor inicial",
                        new BigDecimal("5"),
                        new BigDecimal("50"),
                        false,
                        "Venda inicial",
                        List.of(
                                new VendaRequest.PagamentoRequest(
                                        "parcelas", "Parcelas", new BigDecimal("50.00"),
                                        2, contrato.plusMonths(1), "pendente"
                                )
                        ),
                        null
                )
        );

        VendaResponse atualizada = service.atualizarVenda(
                autenticacao(usuario),
                null,
                venda.id(),
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        novoCliente.getId(),
                        new BigDecimal("120.00"),
                        contrato.plusDays(2),
                        "Corretor atualizado",
                        new BigDecimal("50"),
                        new BigDecimal("50"),
                        true,
                        "Venda revisada",
                        List.of(
                                new VendaRequest.PagamentoRequest(
                                        "parcelas", "Parcelas revisadas", new BigDecimal("60.00"),
                                        2, contrato.plusMonths(1), "pendente"
                                )
                        ),
                        venda.versao()
                )
        );

        assertEquals(novoCliente.getId(), atualizada.clienteId());
        assertDinheiro("120.00", atualizada.valorTotal());
        assertEquals("Corretor atualizado", atualizada.corretorNome());
        assertEquals("Venda revisada", atualizada.observacoes());

        List<ParcelaResponse> geradas = service.listarParcelas(autenticacao(usuario), null)
                .stream()
                .filter(p -> p.vendaId().equals(venda.id()))
                .toList();

        assertEquals(2, geradas.size());
        assertDinheiro("60.00", geradas.get(0).valor());
        assertDinheiro("60.00", geradas.get(1).valor());
    }

    @Test
    void excluiVendaSemRecebimentosELiberaUnidade() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        Unidade unidade = criarUnidade(empresa, usuario, empreendimento);
        Cliente cliente = criarCliente(empresa, usuario);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        VendaResponse venda = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        null,
                        BigDecimal.ZERO,
                        new BigDecimal("50"),
                        false,
                        null,
                        List.of(
                                new VendaRequest.PagamentoRequest(
                                        "parcelas", "Parcelas", new BigDecimal("50.00"),
                                        2, contrato.plusMonths(1), "pendente"
                                )
                        ),
                        null
                )
        );

        assertEquals("vendido", unidades.findById(unidade.getId()).orElseThrow().getStatus());

        service.excluirVenda(autenticacao(usuario), null, venda.id());

        assertEquals("disponivel", unidades.findById(unidade.getId()).orElseThrow().getStatus());
        assertThrows(
                ResponseStatusException.class,
                () -> service.detalharVenda(autenticacao(usuario), null, venda.id())
        );
    }

    @Test
    void naoExcluiVendaQueJaPossuiHistoricoDeRecebimento() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        Unidade unidade = criarUnidade(empresa, usuario, empreendimento);
        Cliente cliente = criarCliente(empresa, usuario);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        VendaResponse venda = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        null,
                        BigDecimal.ZERO,
                        new BigDecimal("50"),
                        false,
                        null,
                        List.of(
                                new VendaRequest.PagamentoRequest(
                                        "parcelas", "Parcela única", new BigDecimal("100.00"),
                                        1, contrato.plusMonths(1), "pendente"
                                )
                        ),
                        null
                )
        );

        ParcelaResponse parcela = service.listarParcelas(autenticacao(usuario), null)
                .stream()
                .filter(p -> p.vendaId().equals(venda.id()))
                .findFirst()
                .orElseThrow();

        service.receber(
                autenticacao(usuario),
                null,
                parcela.id(),
                new RecebimentoRequest(new BigDecimal("100.00"), parcela.vencimento())
        );

        assertThrows(
                ResponseStatusException.class,
                () -> service.excluirVenda(autenticacao(usuario), null, venda.id())
        );
        assertEquals("vendido", unidades.findById(unidade.getId()).orElseThrow().getStatus());
    }

    @Test
    void vendaPodeAlterarSuaRegraDeJurosECorrecaoSemAfetarHistoricoPago() throws Exception {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        empreendimento.setInadimplenciaJson(
                "{\"correcaoAtiva\":true,\"correcaoPctMes\":3,\"jurosAtivo\":false,\"moraAtiva\":false,\"toleranciaAtiva\":false,\"inicioJuros\":\"vencimento\"}"
        );
        empreendimentos.saveAndFlush(empreendimento);

        Unidade unidade = criarUnidade(empresa, usuario, empreendimento);
        Cliente cliente = criarCliente(empresa, usuario);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        List<VendaRequest.PagamentoRequest> composicao = List.of(
                new VendaRequest.PagamentoRequest(
                        "parcelas", "Parcela única", new BigDecimal("100.00"),
                        1, contrato.plusMonths(1), "pendente"
                )
        );

        VendaResponse venda = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        "Corretor teste",
                        new BigDecimal("5"),
                        new BigDecimal("50"),
                        true,
                        null,
                        composicao,
                        null
                )
        );

        // Alterar o padrão do empreendimento não reescreve automaticamente a venda existente.
        empreendimento.setInadimplenciaJson(
                "{\"correcaoAtiva\":true,\"correcaoPctMes\":9,\"jurosAtivo\":false,\"moraAtiva\":false,\"toleranciaAtiva\":false,\"inicioJuros\":\"vencimento\"}"
        );
        empreendimentos.saveAndFlush(empreendimento);

        ParcelaResponse antes = service.listarParcelas(autenticacao(usuario), null)
                .stream()
                .filter(p -> p.vendaId().equals(venda.id()))
                .findFirst()
                .orElseThrow();
        assertDinheiro(
                "3.00",
                antes.regrasInadimplencia().path("correcaoPctMes").decimalValue()
        );

        VendaResponse editada = service.atualizarVenda(
                autenticacao(usuario),
                null,
                venda.id(),
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        "Corretor teste",
                        new BigDecimal("5"),
                        new BigDecimal("50"),
                        true,
                        null,
                        composicao,
                        json.readTree(
                                "{\"correcaoAtiva\":true,\"correcaoPctMes\":6,\"correcaoIndice\":\"Regra da venda\",\"jurosAtivo\":false,\"jurosPctMes\":0,\"jurosPctDia\":0,\"jurosTipo\":\"mensal\",\"moraAtiva\":false,\"moraPct\":0,\"toleranciaAtiva\":false,\"diasTolerancia\":0,\"inicioJuros\":\"vencimento\"}"
                        ),
                        venda.versao()
                )
        );

        ParcelaResponse parcela = service.listarParcelas(autenticacao(usuario), null)
                .stream()
                .filter(p -> p.vendaId().equals(editada.id()))
                .findFirst()
                .orElseThrow();

        assertDinheiro(
                "6.00",
                parcela.regrasInadimplencia().path("correcaoPctMes").decimalValue()
        );

        MovimentoResponse movimento = service.receber(
                autenticacao(usuario),
                null,
                parcela.id(),
                new RecebimentoRequest(null, parcela.vencimento().plusDays(30))
        );

        assertDinheiro("106.00", movimento.valorRecebido());
        assertDinheiro("5.00", movimento.comissaoPaga());
    }

    @Test
    void novaVendaRespeitaPrioridadeUnidadeAgrupamentoEmpreendimento() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        Cliente cliente = criarCliente(empresa, usuario);

        Quadra bloco = new Quadra();
        bloco.setEmpresaId(empresa.getId());
        bloco.setEmpreendimentoId(empreendimento.getId());
        bloco.setNome("Bloco A");
        bloco.setTipoAgrupamento("bloco");
        bloco.setRegrasJson(
                "{\"aliquotaTributaria\":10,\"socioPct\":0,\"empresaPct\":100,"
                        + "\"corretorPct\":5,\"repasseComissaoPct\":50,"
                        + "\"comissaoSobreAcrescimos\":false,\"inadimplencia\":{}}"
        );
        bloco.setCriadoPorUsuarioId(usuario.getId());
        bloco.setAtualizadoPorUsuarioId(usuario.getId());
        bloco = quadras.saveAndFlush(bloco);

        Unidade herdada = criarUnidade(empresa, usuario, empreendimento);
        herdada.setQuadraId(bloco.getId());
        unidades.saveAndFlush(herdada);

        Unidade propria = new Unidade();
        propria.setEmpresaId(empresa.getId());
        propria.setEmpreendimentoId(empreendimento.getId());
        propria.setQuadraId(bloco.getId());
        propria.setNumero("002");
        propria.setUnidade("Unidade 02");
        propria.setArea(new BigDecimal("100"));
        propria.setValorVenda(new BigDecimal("100.00"));
        propria.setStatus("disponivel");
        propria.setRegrasJson(
                "{\"aliquotaTributaria\":20,\"socioPct\":0,\"empresaPct\":100,"
                        + "\"corretorPct\":5,\"repasseComissaoPct\":50,"
                        + "\"comissaoSobreAcrescimos\":false,\"inadimplencia\":{}}"
        );
        propria.setCriadoPorUsuarioId(usuario.getId());
        propria.setAtualizadoPorUsuarioId(usuario.getId());
        propria = unidades.saveAndFlush(propria);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        List<VendaRequest.PagamentoRequest> composicao = List.of(
                new VendaRequest.PagamentoRequest(
                        "parcelas", "Parcela única", new BigDecimal("100.00"),
                        1, contrato.plusMonths(1), "pendente"
                )
        );

        VendaResponse vendaHerdada = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        herdada.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        null,
                        new BigDecimal("5"),
                        new BigDecimal("50"),
                        false,
                        null,
                        composicao,
                        null
                )
        );

        VendaResponse vendaPropria = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        propria.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        null,
                        new BigDecimal("5"),
                        new BigDecimal("50"),
                        false,
                        null,
                        composicao,
                        null
                )
        );

        assertDinheiro(
                "10.00",
                vendaHerdada.regras().path("aliquotaTributaria").decimalValue()
        );
        assertDinheiro(
                "20.00",
                vendaPropria.regras().path("aliquotaTributaria").decimalValue()
        );
    }

    @Test
    void ajustaUltimaParcelaQuandoDivisaoGeraDizimaPeriodica() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa);
        Empreendimento empreendimento = criarEmpreendimento(empresa, usuario);
        Unidade unidade = criarUnidade(empresa, usuario, empreendimento);
        Cliente cliente = criarCliente(empresa, usuario);

        LocalDate contrato = LocalDate.of(2026, 9, 1);
        VendaResponse venda = service.criarVenda(
                autenticacao(usuario),
                null,
                new VendaRequest(
                        empreendimento.getId(),
                        unidade.getId(),
                        cliente.getId(),
                        new BigDecimal("100.00"),
                        contrato,
                        null,
                        BigDecimal.ZERO,
                        new BigDecimal("50"),
                        false,
                        null,
                        List.of(
                                new VendaRequest.PagamentoRequest(
                                        "parcelas", "Parcelas", new BigDecimal("33.33"),
                                        3, contrato.plusMonths(1), "pendente"
                                )
                        ),
                        null
                )
        );

        List<ParcelaResponse> geradas = service.listarParcelas(autenticacao(usuario), null)
                .stream()
                .filter(p -> p.vendaId().equals(venda.id()))
                .toList();

        assertEquals(3, geradas.size());
        assertDinheiro("33.33", geradas.get(0).valor());
        assertDinheiro("33.33", geradas.get(1).valor());
        assertDinheiro("33.34", geradas.get(2).valor());
        assertDinheiro(
                "100.00",
                geradas.stream()
                        .map(ParcelaResponse::valor)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
        );
    }

    private Empresa criarEmpresa() {
        Empresa e = new Empresa();
        e.setNome("Empresa teste");
        e.setSlug("empresa-" + UUID.randomUUID());
        return empresas.saveAndFlush(e);
    }

    private Usuario criarUsuario(Empresa empresa) {
        Usuario u = new Usuario();
        u.setEmpresa(empresa);
        u.setNome("Admin");
        u.setEmail("admin-" + UUID.randomUUID() + "@teste.local");
        u.setSenhaHash("hash-de-teste");
        u.setPerfil(PerfilUsuario.ADMIN);
        u.setAtivo(true);
        return usuarios.saveAndFlush(u);
    }

    private Empreendimento criarEmpreendimento(Empresa empresa, Usuario usuario) {
        Empreendimento e = new Empreendimento();
        e.setEmpresaId(empresa.getId());
        e.setNome("Residencial teste");
        e.setSpe("SPE teste");
        e.setAreaTotal(BigDecimal.ZERO);
        e.setTipo("loteamento");
        e.setUnidadesPrevistas(1);
        e.setValorTotal(new BigDecimal("100.00"));
        e.setSocioPct(new BigDecimal("50"));
        e.setEmpresaPct(new BigDecimal("50"));
        e.setCorretorPct(new BigDecimal("5"));
        e.setAliquotaTributaria(BigDecimal.ZERO);
        e.setRepasseComissaoPct(new BigDecimal("50"));
        e.setComissaoSobreAcrescimos(false);
        e.setStatus("em_vendas");
        e.setCriadoPorUsuarioId(usuario.getId());
        e.setAtualizadoPorUsuarioId(usuario.getId());
        return empreendimentos.saveAndFlush(e);
    }

    private Unidade criarUnidade(Empresa empresa, Usuario usuario, Empreendimento empreendimento) {
        Unidade u = new Unidade();
        u.setEmpresaId(empresa.getId());
        u.setEmpreendimentoId(empreendimento.getId());
        u.setNumero("001");
        u.setUnidade("Lote 01");
        u.setArea(new BigDecimal("100"));
        u.setValorVenda(new BigDecimal("100.00"));
        u.setStatus("disponivel");
        u.setCriadoPorUsuarioId(usuario.getId());
        u.setAtualizadoPorUsuarioId(usuario.getId());
        return unidades.saveAndFlush(u);
    }

    private Cliente criarCliente(Empresa empresa, Usuario usuario) {
        Cliente c = new Cliente();
        c.setEmpresaId(empresa.getId());
        c.setNome("Cliente teste");
        c.setCriadoPorUsuarioId(usuario.getId());
        c.setAtualizadoPorUsuarioId(usuario.getId());
        return clientes.saveAndFlush(c);
    }

    private Authentication autenticacao(Usuario usuario) {
        return UsernamePasswordAuthenticationToken.authenticated(
                usuario.getEmail(), null, List.of()
        );
    }

    private void assertDinheiro(String esperado, BigDecimal atual) {
        assertEquals(0, new BigDecimal(esperado).compareTo(atual));
    }
}
