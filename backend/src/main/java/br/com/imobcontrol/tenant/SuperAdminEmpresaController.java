package br.com.imobcontrol.tenant;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/super-admin/empresas")
public class SuperAdminEmpresaController {

    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;
    private final AuditoriaOperacionalRepository auditoria;

    public SuperAdminEmpresaController(
            EmpresaRepository empresas,
            UsuarioRepository usuarios,
            AuditoriaOperacionalRepository auditoria
    ) {
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.auditoria = auditoria;
    }

    @GetMapping
    public List<EmpresaResumo> listar(
            @RequestParam(defaultValue = "false") boolean incluirInativas
    ) {
        return (incluirInativas
                ? empresas.findAllByOrderByNomeAsc()
                : empresas.findAllByAtivaTrueOrderByNomeAsc())
                .stream()
                .map(this::resumo)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmpresaResumo criar(
            Authentication autenticacao,
            @Valid @RequestBody CriarEmpresa body
    ) {
        Usuario ator = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        Empresa empresa = new Empresa();
        empresa.setNome(body.nome().trim());
        empresa.setSlug(slugUnico(body.nome()));
        empresa.setAtiva(true);

        Empresa salva = empresas.saveAndFlush(empresa);
        auditoria.save(new AuditoriaOperacional(
                salva.getId(),
                ator.getId(),
                "EMPRESA",
                salva.getId(),
                "EMPRESA_CRIADA"
        ));
        return resumo(salva);
    }

    @PutMapping("/{id}")
    public EmpresaResumo atualizar(
            Authentication autenticacao,
            @PathVariable Long id,
            @Valid @RequestBody AtualizarEmpresa body
    ) {
        Usuario ator = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        Empresa empresa = empresas.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empresa não encontrada"));

        empresa.setNome(body.nome().trim());
        if (body.ativa() != null) {
            empresa.setAtiva(body.ativa());
        }
        Empresa salva = empresas.saveAndFlush(empresa);
        auditoria.save(new AuditoriaOperacional(
                salva.getId(),
                ator.getId(),
                "EMPRESA",
                salva.getId(),
                "EMPRESA_ATUALIZADA"
        ));
        return resumo(salva);
    }

    private String slugUnico(String nome) {
        String base = Normalizer.normalize(nome, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "empresa";

        String candidato = base;
        int sufixo = 2;
        while (empresas.findBySlug(candidato).isPresent()) {
            candidato = base + "-" + sufixo++;
        }
        return candidato;
    }

    public record CriarEmpresa(
            @NotBlank @Size(max = 160) String nome
    ) {
    }

    public record AtualizarEmpresa(
            @NotBlank @Size(max = 160) String nome,
            Boolean ativa
    ) {
    }

    private EmpresaResumo resumo(Empresa empresa) {
        long administradoresAtivos =
                usuarios.countByEmpresa_IdAndPerfilAndAtivoTrueAndEmailVerificadoTrueAndSenhaDefinidaTrue(
                        empresa.getId(),
                        PerfilUsuario.ADMIN
                );
        long administradoresPendentes = usuarios.countPendentesAtivacao(
                empresa.getId(),
                PerfilUsuario.ADMIN
        );
        return new EmpresaResumo(
                empresa.getId(),
                empresa.getNome(),
                empresa.getSlug(),
                empresa.isAtiva(),
                administradoresAtivos,
                administradoresPendentes,
                empresa.getCriadoEm(),
                empresa.getAtualizadoEm()
        );
    }

    public record EmpresaResumo(
            Long id,
            String nome,
            String slug,
            boolean ativa,
            long administradoresAtivos,
            long administradoresPendentes,
            java.time.LocalDateTime criadoEm,
            java.time.LocalDateTime atualizadoEm
    ) {
    }
}
