package br.com.imobcontrol.tenant;

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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class EmpresaUsuarioServiceTests {

    @Autowired
    private EmpresaUsuarioService service;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private EmpresaRepository empresas;

    @Test
    void adminCriaFuncionarioSomenteNaPropriaEmpresa() {
        Empresa empresa = criarEmpresa();
        Usuario admin = criarUsuario(empresa, PerfilUsuario.ADMIN);

        UsuarioAdminResponse criado = service.criar(
                autenticacao(admin),
                new EmpresaUsuarioCreateRequest(
                        "Funcionário teste",
                        "func-" + UUID.randomUUID() + "@teste.local",
                        "Senha123!"
                )
        );

        assertEquals(PerfilUsuario.USUARIO, criado.perfil());
        assertEquals(empresa.getId(), criado.empresa().id());
    }

    @Test
    void adminPodeDesativarFuncionarioDaPropriaEmpresa() {
        Empresa empresa = criarEmpresa();
        Usuario admin = criarUsuario(empresa, PerfilUsuario.ADMIN);
        Usuario funcionario = criarUsuario(empresa, PerfilUsuario.USUARIO);

        UsuarioAdminResponse atualizado = service.atualizar(
                autenticacao(admin),
                funcionario.getId(),
                new EmpresaUsuarioUpdateRequest(
                        funcionario.getNome(),
                        funcionario.getEmail(),
                        false,
                        funcionario.getVersao()
                )
        );

        assertFalse(atualizado.ativo());
    }

    @Test
    void adminNaoPodeAlterarFuncionarioDeOutraEmpresa() {
        Empresa empresaAdmin = criarEmpresa();
        Empresa outraEmpresa = criarEmpresa();
        Usuario admin = criarUsuario(empresaAdmin, PerfilUsuario.ADMIN);
        Usuario funcionarioOutra = criarUsuario(outraEmpresa, PerfilUsuario.USUARIO);

        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> service.atualizar(
                        autenticacao(admin),
                        funcionarioOutra.getId(),
                        new EmpresaUsuarioUpdateRequest(
                                funcionarioOutra.getNome(),
                                funcionarioOutra.getEmail(),
                                false,
                                funcionarioOutra.getVersao()
                        )
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
    }

    @Test
    void adminNaoPodeAlterarOutroAdmin() {
        Empresa empresa = criarEmpresa();
        Usuario admin = criarUsuario(empresa, PerfilUsuario.ADMIN);
        Usuario outroAdmin = criarUsuario(empresa, PerfilUsuario.ADMIN);

        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> service.atualizar(
                        autenticacao(admin),
                        outroAdmin.getId(),
                        new EmpresaUsuarioUpdateRequest(
                                outroAdmin.getNome(),
                                outroAdmin.getEmail(),
                                false,
                                outroAdmin.getVersao()
                        )
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
    }

    private Empresa criarEmpresa() {
        Empresa empresa = new Empresa();
        empresa.setNome("Empresa " + UUID.randomUUID());
        empresa.setSlug("empresa-" + UUID.randomUUID());
        return empresas.saveAndFlush(empresa);
    }

    private Usuario criarUsuario(Empresa empresa, PerfilUsuario perfil) {
        Usuario usuario = new Usuario();
        usuario.setNome(perfil + " " + UUID.randomUUID());
        usuario.setEmail("user-" + UUID.randomUUID() + "@teste.local");
        usuario.setSenhaHash("hash-de-teste");
        usuario.setPerfil(perfil);
        usuario.setEmpresa(empresa);
        usuario.setAtivo(true);
        return usuarios.saveAndFlush(usuario);
    }

    private Authentication autenticacao(Usuario usuario) {
        return UsernamePasswordAuthenticationToken.authenticated(
                usuario.getEmail(),
                null,
                List.of()
        );
    }
}
