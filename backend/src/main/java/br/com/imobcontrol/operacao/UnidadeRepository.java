package br.com.imobcontrol.operacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UnidadeRepository extends JpaRepository<Unidade, Long> {
    List<Unidade> findAllByEmpresaIdAndEmpreendimentoIdOrderByNumeroAsc(Long empresaId, Long empreendimentoId);
    Optional<Unidade> findByIdAndEmpresaId(Long id, Long empresaId);
}
