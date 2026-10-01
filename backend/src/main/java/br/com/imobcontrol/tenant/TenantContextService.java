package br.com.imobcontrol.tenant;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TenantContextService {

    private final UsuarioRepository usuarios;
    private final EmpresaRepository empresas;

    public TenantContextService(UsuarioRepository usuarios, EmpresaRepository empresas) {
        this.usuarios = usuarios;
        this.empresas = empresas;
    }

    public Contexto resolver(Authentication autenticacao, Long empresaSolicitada) {
        if (autenticacao == null || !autenticacao.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Usuario usuario = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (!usuario.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário inativo");
        }

        Empresa empresa;
        if (usuario.getPerfil() == PerfilUsuario.SUPER_ADMIN) {
            if (empresaSolicitada == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Selecione explicitamente uma empresa para operar"
                );
            }
            empresa = empresas.findById(empresaSolicitada)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        } else {
            empresa = usuario.getEmpresa();
            if (empresa == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário sem empresa");
            }
            if (empresaSolicitada != null && !empresaSolicitada.equals(empresa.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Empresa não autorizada");
            }
        }

        if (!empresa.isAtiva()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Empresa inativa");
        }

        return new Contexto(empresa.getId(), usuario.getId());
    }

    public record Contexto(Long empresaId, Long usuarioId) {
    }
}
