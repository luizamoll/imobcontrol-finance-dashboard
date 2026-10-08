package br.com.imobcontrol.cliente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditoriaOperacionalRepository
        extends JpaRepository<AuditoriaOperacional, Long> {

    @Query("""
            select a
            from AuditoriaOperacional a
            where (:empresaId is null or a.empresaId = :empresaId)
              and (:usuarioId is null or a.usuarioId = :usuarioId)
              and (:acao is null or :acao = '' or a.acao = :acao)
              and (:entidade is null or :entidade = '' or a.entidade = :entidade)
              and (:inicio is null or a.criadoEm >= :inicio)
              and (:fim is null or a.criadoEm < :fim)
            order by a.criadoEm desc, a.id desc
            """)
    Page<AuditoriaOperacional> buscar(
            @Param("empresaId") Long empresaId,
            @Param("usuarioId") Long usuarioId,
            @Param("acao") String acao,
            @Param("entidade") String entidade,
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            Pageable pageable
    );

    List<AuditoriaOperacional> findAllByEmpresaIdAndEntidadeAndEntidadeIdOrderByCriadoEmDescIdDesc(
            Long empresaId,
            String entidade,
            Long entidadeId
    );
}
