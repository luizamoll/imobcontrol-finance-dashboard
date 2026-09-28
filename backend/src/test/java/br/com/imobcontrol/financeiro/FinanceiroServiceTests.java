package br.com.imobcontrol.financeiro;

import br.com.imobcontrol.cliente.Cliente;
import br.com.imobcontrol.cliente.ClienteRepository;
import br.com.imobcontrol.operacao.Empreendimento;
import br.com.imobcontrol.operacao.EmpreendimentoRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FinanceiroServiceTests {

    @Autowired FinanceiroService service;
    @Autowired EmpresaRepository empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired EmpreendimentoRepository empreendimentos;
    @Autowired UnidadeRepository unidades;
    @Autowired ClienteRepository clientes;

    @Test
    void corretorRecebeMetadeDeCadaRecebimentoAteAtingirCincoPorCentoDaVenda() {
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
        assertDinheiro("3.00", primeiro.saldoComissaoApos());
        assertDinheiro("3.00", segundo.comissaoPaga());
        assertDinheiro("0.00", segundo.saldoComissaoApos());
        assertDinheiro("0.00", terceiro.comissaoPaga());
        assertDinheiro("0.00", terceiro.saldoComissaoApos());
        assertDinheiro("50.00", primeiro.comissaoRepassePctAplicado());
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
