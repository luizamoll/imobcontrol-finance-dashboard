package br.com.imobcontrol.tenant;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/super-admin/empresas")
public class SuperAdminEmpresaController {

    private final EmpresaRepository empresas;

    public SuperAdminEmpresaController(EmpresaRepository empresas) {
        this.empresas = empresas;
    }

    @GetMapping
    public List<EmpresaResumo> listar() {
        return empresas.findAllByAtivaTrueOrderByNomeAsc()
                .stream()
                .map(EmpresaResumo::from)
                .toList();
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
