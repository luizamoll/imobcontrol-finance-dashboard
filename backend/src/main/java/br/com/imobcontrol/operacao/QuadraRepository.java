package br.com.imobcontrol.operacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuadraRepository extends JpaRepository<Quadra, Long> {
    List<Quadra> findAllByEmpresaIdAndEmpreendimentoIdOrderByNomeAsc(Long empresaId, Long empreendimentoId);
    Optional<Quadra> findByIdAndEmpresaId(Long id, Long empresaId);
}
