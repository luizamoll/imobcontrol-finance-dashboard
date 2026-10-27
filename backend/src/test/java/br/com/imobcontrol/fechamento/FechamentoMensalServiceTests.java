package br.com.imobcontrol.fechamento;

import br.com.imobcontrol.financeiro.*;
import br.com.imobcontrol.operacao.*;
import br.com.imobcontrol.tenant.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FechamentoMensalServiceTests {
    @Autowired FechamentoMensalService service;
    @Autowired EmpresaRepository empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired EmpreendimentoRepository empreendimentos;
    @Autowired UnidadeRepository unidades;
    @Autowired VendaRepository vendas;
    @Autowired ParcelaRepository parcelas;
    @Autowired MovimentoRepository movimentos;

    @Test
    void separaAdimplenciaReceitaImpostoPagoRetencaoEEstorno() {
        Empresa empresa = new Empresa();
        empresa.setNome("Empresa de teste");
        empresa.setSlug("mensal-" + UUID.randomUUID());
        empresa = empresas.saveAndFlush(empresa);

        Usuario usuario = new Usuario();
        usuario.setEmpresa(empresa);
        usuario.setNome("Gestor");
        usuario.setEmail("gestor-" + UUID.randomUUID() + "@teste.local");
        usuario.setSenhaHash("hash");
        usuario.setPerfil(PerfilUsuario.ADMIN);
        usuario.setAtivo(true);
        usuario = usuarios.saveAndFlush(usuario);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(
            usuario.getEmail(), null, List.of()
        );

        Empreendimento emp = new Empreendimento();
        emp.setEmpresaId(empresa.getId());
        emp.setNome("Glebas Minas");
        emp.setSpe("SPE");
        emp.setTipo("loteamento");
        emp.setAreaTotal(BigDecimal.ZERO);
        emp.setValorTotal(new BigDecimal("100.00"));
        emp.setUnidadesPrevistas(1);
        emp.setSocioPct(new BigDecimal("50"));
        emp.setEmpresaPct(new BigDecimal("50"));
        emp.setCorretorPct(BigDecimal.ZERO);
        emp.setAliquotaTributaria(BigDecimal.ZERO);
        emp.setRepasseComissaoPct(new BigDecimal("50"));
        emp.setStatus("em_vendas");
        emp.setCriadoPorUsuarioId(usuario.getId());
        emp.setAtualizadoPorUsuarioId(usuario.getId());
        emp = empreendimentos.saveAndFlush(emp);

        Unidade u = new Unidade();
        u.setEmpresaId(empresa.getId());
        u.setEmpreendimentoId(emp.getId());
        u.setNumero("G01");
        u.setUnidade("Gleba 01");
        u.setUnidadeTipo("Gleba rural");
        u.setArea(BigDecimal.ONE);
        u.setValorVenda(new BigDecimal("100.00"));
        u.setStatus("vendido");
        u.setCriadoPorUsuarioId(usuario.getId());
        u.setAtualizadoPorUsuarioId(usuario.getId());
        u = unidades.saveAndFlush(u);

        Venda venda = new Venda();
        venda.setEmpresaId(empresa.getId());
        venda.setEmpreendimentoId(emp.getId());
        venda.setUnidadeId(u.getId());
        venda.setClienteId(1000L);
        venda.setValorTotal(new BigDecimal("100.00"));
        venda.setDataContrato(LocalDate.of(2026, 9, 1));
        venda.setCorretorPct(BigDecimal.ZERO);
        venda.setRepasseComissaoPct(new BigDecimal("50"));
        venda.setRegrasJson("{}");
        venda.setStatus("ativa");
        venda.setCriadoPorUsuarioId(usuario.getId());
        venda.setAtualizadoPorUsuarioId(usuario.getId());
        venda = vendas.saveAndFlush(venda);

        Parcela parcela = new Parcela();
        parcela.setEmpresaId(empresa.getId());
        parcela.setVendaId(venda.getId());
        parcela.setEmpreendimentoId(emp.getId());
        parcela.setUnidadeId(u.getId());
        parcela.setClienteId(1000L);
        parcela.setOrigemTipo("parcelas");
        parcela.setNumero(1);
        parcela.setTotalParcelas(1);
        parcela.setVencimento(LocalDate.of(2026, 10, 10));
        parcela.setValor(new BigDecimal("100.00"));
        parcela.setValorOriginal(new BigDecimal("100.00"));
        parcela.setValorPago(BigDecimal.ZERO);
        parcela.setStatus("pendente");
        parcela = parcelas.saveAndFlush(parcela);

        var antes = service.consultar(auth, null, "2026-10", emp.getId());
        assertEquals(1, antes.totalGlebas());
        assertEquals(1, antes.glebasInadimplentes());
        assertEquals(0, antes.glebasAdimplentes());

        Movimento movimento = new Movimento();
        movimento.setEmpresaId(empresa.getId());
        movimento.setVendaId(venda.getId());
        movimento.setParcelaId(parcela.getId());
        movimento.setEmpreendimentoId(emp.getId());
        movimento.setUnidadeId(u.getId());
        movimento.setClienteId(1000L);
        movimento.setOrigem("parcelas");
        movimento.setDataMovimento(LocalDate.of(2026, 10, 20));
        movimento.setUsuarioId(usuario.getId());
        movimento.setValorRecebido(new BigDecimal("100.00"));
        movimento.setImpostoReservado(new BigDecimal("10.00"));
        movimento.setComissaoPaga(BigDecimal.ZERO);
        movimento.setEmpresaValor(new BigDecimal("45.00"));
        movimento.setSocioValor(new BigDecimal("45.00"));
        movimento.setEstornado(false);
        movimentos.saveAndFlush(movimento);

        service.cadastrar(auth, null, lancamento(emp.getId(), "OUTRA_RECEITA", "100.00"));
        service.cadastrar(auth, null, lancamento(emp.getId(), "CUSTO_EMPREENDIMENTO", "20.00"));
        service.cadastrar(auth, null, lancamento(emp.getId(), "IMPOSTO_PAGO", "10.00"));
        service.cadastrar(auth, null, lancamento(emp.getId(), "DISTRATO_DEVOLUCAO", "5.00"));
        var retencao = service.cadastrar(auth, null, lancamento(emp.getId(), "RETENCAO", "15.00"));

        var finalizado = service.consultar(auth, null, "2026-10", emp.getId());
        assertEquals(1, finalizado.glebasAdimplentes());
        assertEquals(0, finalizado.glebasInadimplentes());
        dinheiro("100.00", finalizado.recebidoParcelas());
        dinheiro("200.00", finalizado.valorTotalRecebido());
        dinheiro("10.00", finalizado.impostoPago());
        dinheiro("10.00", finalizado.impostoReservado());
        dinheiro("45.00", finalizado.valorSocio());
        dinheiro("45.00", finalizado.valorEmpreendedor());
        dinheiro("150.00", finalizado.saldoDisponivelEstimado());

        service.estornar(auth, null, retencao.id());
        var depois = service.consultar(auth, null, "2026-10", emp.getId());
        dinheiro("0.00", depois.valorRetido());
        dinheiro("165.00", depois.saldoDisponivelEstimado());
        assertTrue(depois.lancamentos().stream()
            .anyMatch(l -> l.id().equals(retencao.id()) && l.estornado()));
    }

    @Test
    void rejeitaMesInvalido() {
        assertThrows(ResponseStatusException.class, () ->
            FechamentoMensalService.periodo("2026-13"));
    }

    private FechamentoLancamentoRequest lancamento(Long empId, String tipo, String valor) {
        return new FechamentoLancamentoRequest(
            empId, LocalDate.of(2026, 10, 20), tipo, "Referência teste", new BigDecimal(valor)
        );
    }

    private void dinheiro(String esperado, BigDecimal atual) {
        assertEquals(0, new BigDecimal(esperado).compareTo(atual));
    }
}
