package br.com.imobcontrol.tenant;

import br.com.imobcontrol.cliente.AuditoriaOperacional;
import br.com.imobcontrol.cliente.AuditoriaOperacionalRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/super-admin/auditoria")
public class SuperAdminAuditoriaController {

    private final AuditoriaOperacionalRepository auditoria;
    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;

    public SuperAdminAuditoriaController(
            AuditoriaOperacionalRepository auditoria,
            EmpresaRepository empresas,
            UsuarioRepository usuarios
    ) {
        this.auditoria = auditoria;
        this.empresas = empresas;
        this.usuarios = usuarios;
    }

    @GetMapping
    public Page<RegistroAuditoria> listar(
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamanho,
            @RequestParam(required = false) Long empresaId,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) String acao,
            @RequestParam(required = false) String entidade,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime inicio,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fim
    ) {
        int tamanhoSeguro = Math.max(1, Math.min(tamanho, 200));
        return auditoria.buscar(
                        empresaId,
                        usuarioId,
                        acao == null ? null : acao.trim(),
                        entidade == null ? null : entidade.trim(),
                        inicio,
                        fim,
                        PageRequest.of(Math.max(0, pagina), tamanhoSeguro)
                )
                .map(this::toResponse);
    }

    private RegistroAuditoria toResponse(AuditoriaOperacional registro) {
        String empresaNome = empresas.findById(registro.getEmpresaId())
                .map(Empresa::getNome)
                .orElse("Empresa #" + registro.getEmpresaId());

        String usuarioNome = usuarios.findById(registro.getUsuarioId())
                .map(Usuario::getNome)
                .orElse("Usuário #" + registro.getUsuarioId());

        return new RegistroAuditoria(
                registro.getId(),
                registro.getEmpresaId(),
                empresaNome,
                registro.getUsuarioId(),
                usuarioNome,
                registro.getEntidade(),
                registro.getEntidadeId(),
                registro.getAcao(),
                registro.getDetalhes(),
                registro.getCriadoEm()
        );
    }

    public record RegistroAuditoria(
            Long id,
            Long empresaId,
            String empresaNome,
            Long usuarioId,
            String usuarioNome,
            String entidade,
            Long entidadeId,
            String acao,
            String detalhes,
            java.time.LocalDateTime criadoEm
    ) {
    }
}
