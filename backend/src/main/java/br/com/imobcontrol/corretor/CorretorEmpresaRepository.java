package br.com.imobcontrol.corretor;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CorretorEmpresaRepository extends JpaRepository<CorretorEmpresa, Long> {
    List<CorretorEmpresa> findByEmpresaIdOrderByNomeAsc(Long empresaId);
    boolean existsByEmpresaIdAndNomeIgnoreCase(Long empresaId, String nome);
    Optional<CorretorEmpresa> findByIdAndEmpresaId(Long id, Long empresaId);
}