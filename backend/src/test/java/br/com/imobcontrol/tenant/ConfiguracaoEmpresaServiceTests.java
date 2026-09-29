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
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ConfiguracaoEmpresaServiceTests {

    @Autowired
    private ConfiguracaoEmpresaService service;

    @Autowired
    private EmpresaRepository empresas;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private JsonMapper json;

    @Test
    void adminSalvaConfiguracaoDaPropriaEmpresaComControleDeVersao() {
        Empresa empresa = criarEmpresa();
        Usuario admin = criarUsuario(empresa, PerfilUsuario.ADMIN);

        ObjectNode config = configValida();
        ConfiguracaoEmpresaResponse criada = service.salvar(
                autenticacao(admin),
                empresa.getId(),
                new ConfiguracaoEmpresaRequest(config, null)
        );

        assertEquals(empresa.getId(), criada.empresaId());
        assertNotNull(criada.versao());
        assertEquals(5, criada.config().path("padroesEmpreendimento").path("corretorPct").asInt());

        ObjectNode alterada = configValida();
        alterada.withObject("/dadosEmpresa").put("telefone", "(31) 99999-0000");

        ConfiguracaoEmpresaResponse salva = service.salvar(
                autenticacao(admin),
                empresa.getId(),
                new ConfiguracaoEmpresaRequest(alterada, criada.versao())
        );

        assertTrue(salva.versao() > criada.versao());
        assertEquals(
                "(31) 99999-0000",
                salva.config().path("dadosEmpresa").path("telefone").asText()
        );
    }

    @Test
    void adminNaoPodeConfigurarOutraEmpresa() {
        Empresa empresa = criarEmpresa();
        Empresa outra = criarEmpresa();
        Usuario admin = criarUsuario(empresa, PerfilUsuario.ADMIN);

        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> service.salvar(
                        autenticacao(admin),
                        outra.getId(),
                        new ConfiguracaoEmpresaRequest(configValida(), null)
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
    }

    @Test
    void usuarioSemPermissaoNaoAlteraConfiguracao() {
        Empresa empresa = criarEmpresa();
        Usuario usuario = criarUsuario(empresa, PerfilUsuario.USUARIO);

        ResponseStatusException erro = assertThrows(
                ResponseStatusException.class,
                () -> service.salvar(
                        autenticacao(usuario),
                        empresa.getId(),
                        new ConfiguracaoEmpresaRequest(configValida(), null)
                )
        );

        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
    }

    private ObjectNode configValida() {
        ObjectNode root = json.createObjectNode();
        root.put("onboardingConcluido", true);

        ObjectNode dados = root.putObject("dadosEmpresa");
        dados.put("cnpj", "");
        dados.put("email", "contato@teste.local");
        dados.put("telefone", "");

        ObjectNode padroes = root.putObject("padroesEmpreendimento");
        padroes.put("socioPct", 0);
        padroes.put("empresaPct", 100);
        padroes.put("corretorPct", 5);
        padroes.put("aliquotaTributaria", 0);
        padroes.put("repasseComissaoPct", 50);
        padroes.put("comissaoSobreAcrescimos", false);

        ObjectNode inad = padroes.putObject("inadimplencia");
        inad.put("correcaoPctMes", 0);
        inad.put("jurosPctMes", 0);
        inad.put("jurosPctDia", 0);
        inad.put("moraPct", 0);
        inad.put("diasTolerancia", 0);
        return root;
    }

    private Empresa criarEmpresa() {
        Empresa empresa = new Empresa();
        empresa.setNome("Empresa " + UUID.randomUUID());
        empresa.setSlug("empresa-" + UUID.randomUUID());
        empresa.setAtiva(true);
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
