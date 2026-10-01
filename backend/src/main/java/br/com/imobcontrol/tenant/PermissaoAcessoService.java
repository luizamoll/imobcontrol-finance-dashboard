package br.com.imobcontrol.tenant;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PermissaoAcessoService {

    private final UsuarioRepository usuarios;

    public PermissaoAcessoService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    public Usuario usuarioAtual(Authentication autenticacao) {
        if (autenticacao == null || !autenticacao.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        Usuario usuario = usuarios.findByEmailIgnoreCase(autenticacao.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        if (!usuario.isAtivo()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário inativo");
        }

        if (usuario.getPerfil() != PerfilUsuario.SUPER_ADMIN) {
            if (usuario.getEmpresa() == null || !usuario.getEmpresa().isAtiva()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Empresa inativa ou não vinculada");
            }
        }

        return usuario;
    }

    public boolean tem(Authentication autenticacao, PermissaoUsuario permissao) {
        Usuario usuario = usuarioAtual(autenticacao);
        if (usuario.getPerfil() == PerfilUsuario.SUPER_ADMIN
                || usuario.getPerfil() == PerfilUsuario.ADMIN) {
            return true;
        }
        return possui(usuario, permissao);
    }

    private boolean possui(Usuario usuario, PermissaoUsuario permissao) {
        if (usuario.getPermissoes().contains(permissao)) {
            return true;
        }

        return usuario.getPermissoes().contains(PermissaoUsuario.VENDAS_GERENCIAR)
                && (permissao == PermissaoUsuario.VENDAS_CRIAR
                || permissao == PermissaoUsuario.VENDAS_EDITAR
                || permissao == PermissaoUsuario.VENDAS_EXCLUIR);
    }

    public void exigir(Authentication autenticacao, PermissaoUsuario permissao) {
        if (!tem(autenticacao, permissao)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Seu usuário não possui permissão para esta ação"
            );
        }
    }

    public void exigirQualquer(
            Authentication autenticacao,
            PermissaoUsuario... permissoes
    ) {
        Usuario usuario = usuarioAtual(autenticacao);
        if (usuario.getPerfil() == PerfilUsuario.SUPER_ADMIN
                || usuario.getPerfil() == PerfilUsuario.ADMIN) {
            return;
        }

        for (PermissaoUsuario permissao : permissoes) {
            if (possui(usuario, permissao)) {
                return;
            }
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Seu usuário não possui permissão para acessar este módulo"
        );
    }
}
