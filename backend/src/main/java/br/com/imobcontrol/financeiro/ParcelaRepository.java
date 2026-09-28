package br.com.imobcontrol.financeiro;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ParcelaRepository extends JpaRepository<Parcela, Long> {
    List<Parcela> findAllByEmpresaIdOrderByVencimentoAscIdAsc(Long empresaId);
    List<Parcela> findAllByEmpresaIdAndVendaIdOrderByVencimentoAscIdAsc(Long empresaId, Long vendaId);
    Optional<Parcela> findByIdAndEmpresaId(Long id, Long empresaId);
    void deleteByEmpresaIdAndVendaId(Long empresaId, Long vendaId);
    boolean existsByEmpresaIdAndVendaIdAndStatusNot(Long empresaId, Long vendaId, String status);
}
