package br.com.imobcontrol.tenant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select u
            from Usuario u
            left join u.empresa e
            where (:empresaId is null or e.id = :empresaId)
              and (:perfil is null or u.perfil = :perfil)
              and (:ativo is null or u.ativo = :ativo)
              and (
                    :busca is null
                    or :busca = ''
                    or lower(u.nome) like lower(concat('%', :busca, '%'))
                    or lower(u.email) like lower(concat('%', :busca, '%'))
                  )
            """)
    Page<Usuario> buscar(
            @Param("empresaId") Long empresaId,
            @Param("perfil") PerfilUsuario perfil,
            @Param("ativo") Boolean ativo,
            @Param("busca") String busca,
            Pageable pageable
    );

    long countByAtivoTrue();
    long countByAtivoFalse();
    long countByPerfil(PerfilUsuario perfil);
    long countByEmpresa_IdAndPerfilAndAtivoTrueAndEmailVerificadoTrueAndSenhaDefinidaTrue(
            Long empresaId,
            PerfilUsuario perfil
    );

    @Query("""
            select count(u)
            from Usuario u
            where u.empresa.id = :empresaId
              and u.perfil = :perfil
              and u.ativo = true
              and (u.emailVerificado = false or u.senhaDefinida = false)
            """)
    long countPendentesAtivacao(
            @Param("empresaId") Long empresaId,
            @Param("perfil") PerfilUsuario perfil
    );
}
