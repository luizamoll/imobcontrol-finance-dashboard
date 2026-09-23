package br.com.imobcontrol.cliente;

import br.com.imobcontrol.tenant.Empresa;
import br.com.imobcontrol.tenant.EmpresaRepository;
import br.com.imobcontrol.tenant.PerfilUsuario;
import br.com.imobcontrol.tenant.Usuario;
import br.com.imobcontrol.tenant.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ClienteServiceTests {

    @Autowired
    private ClienteService clientes;

    @Autowired
    private EmpresaRepository empresas;

    @Autowired
    private UsuarioRepository usuarios;

    @Test
    void clienteDeUmaEmpresaNaoPodeSerVistoOuAlteradoPorOutra() {
        Usuario ana = criarUsuario(criarEmpresa(), "ana");
        Usuario bruno = criarUsuario(criarEmpresa(), "bruno");
        ClienteResponse criado = clientes.cadastrar(autenticacao(ana), null, dados("529.982.247-25", null));
        assertEquals(ana.getEmpresa().getId(), criado.empresaId());

        ResponseStatusException acessoNegado = assertThrows(
                ResponseStatusException.class,
                () -> clientes.detalhar(autenticacao(bruno), null, criado.id())
        );
        assertEquals(HttpStatus.NOT_FOUND, acessoNegado.getStatusCode());

        ResponseStatusException alteracaoNegada = assertThrows(
                ResponseStatusException.class,
                () -> clientes.atualizar(autenticacao(bruno), null, criado.id(),
                        dados("529.982.247-25", criado.versao()))
        );
        assertEquals(HttpStatus.NOT_FOUND, alteracaoNegada.getStatusCode());

        // A unicidade do CPF e por empresa, nao global.
        ClienteResponse outro = clientes.cadastrar(
                autenticacao(bruno), null, dados("529.982.247-25", null)
        );
        assertNotNull(outro.id());
    }

    @Test
    void impedeSobrescritaDeEdicaoAntiga() {
        Usuario ana = criarUsuario(criarEmpresa(), "ana");
        ClienteResponse criado = clientes.cadastrar(autenticacao(ana), null, dados(null, null));
        ClienteResponse atualizado = clientes.atualizar(
                autenticacao(ana), null, criado.id(), dados(null, criado.versao())
        );
        assertEquals(criado.versao() + 1, atualizado.versao());

        ResponseStatusException conflito = assertThrows(
                ResponseStatusException.class,
                () -> clientes.atualizar(
                        autenticacao(ana), null, criado.id(), dados(null, criado.versao())
                )
        );
        assertEquals(HttpStatus.CONFLICT, conflito.getStatusCode());
    }

    @Test
    void rejeitaCpfInvalido() {
        Usuario ana = criarUsuario(criarEmpresa(), "ana");
        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> clientes.cadastrar(autenticacao(ana), null, dados("111.111.111-11", null))
        );
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
    }

    private Empresa criarEmpresa() {
        Empresa empresa = new Empresa();
        empresa.setNome("Empresa de teste");
        empresa.setSlug("teste-" + UUID.randomUUID());
        return empresas.saveAndFlush(empresa);
    }

    private Usuario criarUsuario(Empresa empresa, String nome) {
        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(nome + "-" + UUID.randomUUID() + "@teste.local");
        usuario.setSenhaHash("hash-de-teste");
        usuario.setPerfil(PerfilUsuario.ADMIN);
        usuario.setEmpresa(empresa);
        return usuarios.saveAndFlush(usuario);
    }

    private Authentication autenticacao(Usuario usuario) {
        return UsernamePasswordAuthenticationToken.authenticated(
                usuario.getEmail(), null, List.of()
        );
    }

    private ClienteRequest dados(String cpf, Long versao) {
        return new ClienteRequest(
                "Compradora de teste", cpf, null, null, null, null, null,
                null, null, null, null, null, null, versao
        );
    }
}
