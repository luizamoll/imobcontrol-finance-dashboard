package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface ParcelaRepository extends JpaRepository<Parcela, Long> {
    List<Parcela> findAllByEmpresaIdOrderByVencimentoAscIdAsc(Long empresaId);
    List<Parcela> findAllByEmpresaIdAndVendaIdOrderByVencimentoAscIdAsc(Long empresaId, Long vendaId);
    List<Parcela> findAllByEmpresaIdAndAcordoIdOrderByVencimentoAscIdAsc(Long empresaId, Long acordoId);
    Optional<Parcela> findByIdAndEmpresaId(Long id, Long empresaId);

    // Serializa baixas e estornos da mesma parcela para evitar duplo processamento.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Parcela p where p.id = :id and p.empresaId = :empresaId")
    Optional<Parcela> findByIdAndEmpresaIdForUpdate(@Param("id") Long id, @Param("empresaId") Long empresaId);
    void deleteByEmpresaIdAndVendaId(Long empresaId, Long vendaId);
    boolean existsByEmpresaIdAndVendaIdAndStatusNot(Long empresaId, Long vendaId, String status);
}
