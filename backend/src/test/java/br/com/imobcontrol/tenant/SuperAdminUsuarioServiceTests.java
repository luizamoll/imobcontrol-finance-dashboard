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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SuperAdminUsuarioServiceTests {

    @Autowired
    private SuperAdminUsuarioService service;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private EmpresaRepository empresas;

    @Test
    void superAdminCriaAdminDeEmpresa() {
        Usuario superAdmin = criarSuperAdmin();
        Empresa empresa = criarEmpresa();

        UsuarioAdminResponse criado = service.criar(
                autenticacao(superAdmin),
                new UsuarioAdminCreateRequest(
                        "Administrador Cliente",
                        "admin-" + UUID.randomUUID() + "@teste.local",
                        empresa.getId(),
                        PerfilUsuario.ADMIN,
                        "Senha123!"
                )
        );

        assertNotNull(criado.id());
        assertEquals(PerfilUsuario.ADMIN, criado.perfil());
        assertEquals(empresa.getId(), criado.empresa().id());
        assertEquals(true, criado.ativo());
    }

    @Test
    void painelNaoCriaOutroSuperAdmin() {
        Usuario superAdmin = criarSuperAdmin();
        Empresa empresa = criarEmpresa();

        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> service.criar(
                        autenticacao(superAdmin),
                        new UsuarioAdminCreateRequest(
                                "Outro super admin",
                                "super-" + UUID.randomUUID() + "@teste.local",
                                empresa.getId(),
                                PerfilUsuario.SUPER_ADMIN,
                                "Senha123!"
                        )
                )
        );

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
    }

    @Test
    void contaSuperAdminEProtegidaContraEdicaoDoPainel() {
        Usuario superAdmin = criarSuperAdmin();

        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> service.atualizar(
                        autenticacao(superAdmin),
                        superAdmin.getId(),
                        new UsuarioAdminUpdateRequest(
                                superAdmin.getNome(),
                                superAdmin.getEmail(),
                                criarEmpresa().getId(),
                                PerfilUsuario.ADMIN,
                                true,
                                superAdmin.getVersao()
                        )
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
    }

    @Test
    void superAdminPodeDesativarUsuarioOperacional() {
        Usuario superAdmin = criarSuperAdmin();
        Empresa empresa = criarEmpresa();

        UsuarioAdminResponse criado = service.criar(
                autenticacao(superAdmin),
                new UsuarioAdminCreateRequest(
                        "Operacional",
                        "op-" + UUID.randomUUID() + "@teste.local",
                        empresa.getId(),
                        PerfilUsuario.USUARIO,
                        "Senha123!"
                )
        );

        UsuarioAdminResponse atualizado = service.atualizar(
                autenticacao(superAdmin),
                criado.id(),
                new UsuarioAdminUpdateRequest(
                        criado.nome(),
                        criado.email(),
                        empresa.getId(),
                        PerfilUsuario.USUARIO,
                        false,
                        criado.versao()
                )
        );

        assertFalse(atualizado.ativo());
        assertEquals(criado.versao() + 1, atualizado.versao());
    }

    private Usuario criarSuperAdmin() {
        Usuario usuario = new Usuario();
        usuario.setNome("Super Admin");
        usuario.setEmail("super-" + UUID.randomUUID() + "@teste.local");
        usuario.setSenhaHash("hash-de-teste");
        usuario.setPerfil(PerfilUsuario.SUPER_ADMIN);
        usuario.setAtivo(true);
        return usuarios.saveAndFlush(usuario);
    }

    private Empresa criarEmpresa() {
        Empresa empresa = new Empresa();
        empresa.setNome("Empresa " + UUID.randomUUID());
        empresa.setSlug("empresa-" + UUID.randomUUID());
        return empresas.saveAndFlush(empresa);
    }

    private Authentication autenticacao(Usuario usuario) {
        return UsernamePasswordAuthenticationToken.authenticated(
                usuario.getEmail(),
                null,
                List.of()
        );
    }
}
