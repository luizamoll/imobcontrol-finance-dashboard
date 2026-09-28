package br.com.imobcontrol.operacao;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmpreendimentoRepository extends JpaRepository<Empreendimento, Long> {
    Page<Empreendimento> findByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Empreendimento> findByIdAndEmpresaId(Long id, Long empresaId);
}
