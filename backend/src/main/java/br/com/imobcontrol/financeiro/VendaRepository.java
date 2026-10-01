package br.com.imobcontrol.financeiro;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VendaRepository extends JpaRepository<Venda, Long> {
    Page<Venda> findByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Venda> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByEmpresaIdAndUnidadeIdAndStatus(Long empresaId, Long unidadeId, String status);
}
