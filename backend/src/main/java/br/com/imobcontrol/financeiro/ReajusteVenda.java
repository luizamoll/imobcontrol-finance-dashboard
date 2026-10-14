package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="reajustes_venda")
public class ReajusteVenda {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="empresa_id", nullable=false) private Long empresaId;
    @Column(name="venda_id", nullable=false) private Long vendaId;
    @Column(name="data_referencia", nullable=false) private LocalDate dataReferencia;
    @Column(name="percentual_aplicado", nullable=false, precision=9, scale=4) private BigDecimal percentualAplicado;
    @Column(name="indice_referencia", length=80) private String indiceReferencia;
    @Column(name="criado_por_usuario_id", nullable=false) private Long criadoPorUsuarioId;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm;
    @PrePersist void prePersist(){criadoEm=LocalDateTime.now();}
    public Long getId(){return id;}
    public Long getEmpresaId(){return empresaId;} public void setEmpresaId(Long v){empresaId=v;}
    public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;}
    public LocalDate getDataReferencia(){return dataReferencia;} public void setDataReferencia(LocalDate v){dataReferencia=v;}
    public BigDecimal getPercentualAplicado(){return percentualAplicado;} public void setPercentualAplicado(BigDecimal v){percentualAplicado=v;}
    public String getIndiceReferencia(){return indiceReferencia;} public void setIndiceReferencia(String v){indiceReferencia=v;}
    public Long getCriadoPorUsuarioId(){return criadoPorUsuarioId;} public void setCriadoPorUsuarioId(Long v){criadoPorUsuarioId=v;}
    public LocalDateTime getCriadoEm(){return criadoEm;}
}
