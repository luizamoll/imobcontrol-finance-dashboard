package br.com.imobcontrol.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TokenAcessoRepository extends JpaRepository<TokenAcesso, Long> {
    Optional<TokenAcesso> findByTokenHashAndTipo(String tokenHash, TipoTokenAcesso tipo);
    List<TokenAcesso> findAllByUsuario_IdAndTipoAndUsadoEmIsNull(Long usuarioId, TipoTokenAcesso tipo);
    List<TokenAcesso> findAllByUsuario_IdAndUsadoEmIsNull(Long usuarioId);
}
