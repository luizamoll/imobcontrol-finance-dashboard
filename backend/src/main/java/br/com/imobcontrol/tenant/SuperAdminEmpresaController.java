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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

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
    public List<EmpresaResumo> listar() {
        return empresas.findAllByAtivaTrueOrderByNomeAsc()
                .stream()
                .map(EmpresaResumo::from)
                .toList();
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
        Empresa salva = empresas.saveAndFlush(empresa);
        auditoria.save(new AuditoriaOperacional(
                salva.getId(),
                ator.getId(),
                "EMPRESA",
                salva.getId(),
                "EMPRESA_ATUALIZADA"
        ));
        return EmpresaResumo.from(salva);
    }

    public record AtualizarEmpresa(
            @NotBlank @Size(max = 160) String nome
    ) {
    }

    public record EmpresaResumo(Long id, String nome, String slug) {
        static EmpresaResumo from(Empresa empresa) {
            return new EmpresaResumo(
                    empresa.getId(),
                    empresa.getNome(),
                    empresa.getSlug()
            );
        }
    }
}
