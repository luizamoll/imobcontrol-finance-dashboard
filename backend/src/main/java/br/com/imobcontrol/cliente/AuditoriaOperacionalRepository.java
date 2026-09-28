package br.com.imobcontrol.cliente;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditoriaOperacionalRepository
        extends JpaRepository<AuditoriaOperacional, Long> {

    @Query("""
            select a
            from AuditoriaOperacional a
            where (:empresaId is null or a.empresaId = :empresaId)
              and (:acao is null or :acao = '' or a.acao = :acao)
            order by a.criadoEm desc
            """)
    Page<AuditoriaOperacional> buscar(
            @Param("empresaId") Long empresaId,
            @Param("acao") String acao,
            Pageable pageable
    );
}
