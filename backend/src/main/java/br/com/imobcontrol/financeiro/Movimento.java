package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="movimentos")
public class Movimento {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="empresa_id", nullable=false) private Long empresaId;
    @Column(name="parcela_id", nullable=false) private Long parcelaId;
    @Column(name="venda_id", nullable=false) private Long vendaId;
    @Column(name="empreendimento_id", nullable=false) private Long empreendimentoId;
    @Column(name="unidade_id", nullable=false) private Long unidadeId;
    @Column(name="cliente_id", nullable=false) private Long clienteId;
    @Column(name="corretor_nome", length=160) private String corretorNome;
    @Column(nullable=false, length=40) private String origem;
    @Column(name="origem_descricao", length=240) private String origemDescricao;
    @Column(name="data_movimento", nullable=false) private LocalDate dataMovimento;
    @Column(name="usuario_id", nullable=false) private Long usuarioId;
    @Column(name="valor_recebido", nullable=false, precision=19, scale=2) private BigDecimal valorRecebido;
    @Column(name="imposto_reservado", nullable=false, precision=19, scale=2) private BigDecimal impostoReservado;
    @Column(name="comissao_paga", nullable=false, precision=19, scale=2) private BigDecimal comissaoPaga;
    @Column(name="empresa_valor", nullable=false, precision=19, scale=2) private BigDecimal empresaValor;
    @Column(name="socio_valor", nullable=false, precision=19, scale=2) private BigDecimal socioValor;
    @Column(name="aliquota_tributaria_aplicada", precision=9, scale=4) private BigDecimal aliquotaTributariaAplicada;
    @Column(name="empresa_pct_aplicada", precision=9, scale=4) private BigDecimal empresaPctAplicada;
    @Column(name="socio_pct_aplicada", precision=9, scale=4) private BigDecimal socioPctAplicada;
    @Column(name="comissao_base_calculo", precision=19, scale=2) private BigDecimal comissaoBaseCalculo;
    @Column(name="comissao_repasse_pct_aplicado", precision=9, scale=4) private BigDecimal comissaoRepassePctAplicado;
    @Column(name="comissao_sobre_acrescimos_aplicada") private Boolean comissaoSobreAcrescimosAplicada;
    @Column(name="acrescimos_recebidos", precision=19, scale=2) private BigDecimal acrescimosRecebidos;
    @Column(name="comissao_teorica", precision=19, scale=2) private BigDecimal comissaoTeorica;
    @Column(name="saldo_comissao_apos", precision=19, scale=2) private BigDecimal saldoComissaoApos;
    @Column(nullable=false) private boolean estornado;
    @Column(name="estornado_em") private LocalDateTime estornadoEm;
    @Column(name="estornado_por_usuario_id") private Long estornadoPorUsuarioId;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm;
    @PrePersist void prePersist(){criadoEm=LocalDateTime.now();}
    public Long getId(){return id;} public Long getEmpresaId(){return empresaId;} public void setEmpresaId(Long v){empresaId=v;}
    public Long getParcelaId(){return parcelaId;} public void setParcelaId(Long v){parcelaId=v;} public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;}
    public Long getEmpreendimentoId(){return empreendimentoId;} public void setEmpreendimentoId(Long v){empreendimentoId=v;} public Long getUnidadeId(){return unidadeId;} public void setUnidadeId(Long v){unidadeId=v;}
    public Long getClienteId(){return clienteId;} public void setClienteId(Long v){clienteId=v;} public String getCorretorNome(){return corretorNome;} public void setCorretorNome(String v){corretorNome=v;}
    public String getOrigem(){return origem;} public void setOrigem(String v){origem=v;} public String getOrigemDescricao(){return origemDescricao;} public void setOrigemDescricao(String v){origemDescricao=v;}
    public LocalDate getDataMovimento(){return dataMovimento;} public void setDataMovimento(LocalDate v){dataMovimento=v;} public Long getUsuarioId(){return usuarioId;} public void setUsuarioId(Long v){usuarioId=v;}
    public BigDecimal getValorRecebido(){return valorRecebido;} public void setValorRecebido(BigDecimal v){valorRecebido=v;} public BigDecimal getImpostoReservado(){return impostoReservado;} public void setImpostoReservado(BigDecimal v){impostoReservado=v;}
    public BigDecimal getComissaoPaga(){return comissaoPaga;} public void setComissaoPaga(BigDecimal v){comissaoPaga=v;} public BigDecimal getEmpresaValor(){return empresaValor;} public void setEmpresaValor(BigDecimal v){empresaValor=v;}
    public BigDecimal getSocioValor(){return socioValor;} public void setSocioValor(BigDecimal v){socioValor=v;} public BigDecimal getAliquotaTributariaAplicada(){return aliquotaTributariaAplicada;} public void setAliquotaTributariaAplicada(BigDecimal v){aliquotaTributariaAplicada=v;}
    public BigDecimal getEmpresaPctAplicada(){return empresaPctAplicada;} public void setEmpresaPctAplicada(BigDecimal v){empresaPctAplicada=v;} public BigDecimal getSocioPctAplicada(){return socioPctAplicada;} public void setSocioPctAplicada(BigDecimal v){socioPctAplicada=v;}
    public BigDecimal getComissaoBaseCalculo(){return comissaoBaseCalculo;} public void setComissaoBaseCalculo(BigDecimal v){comissaoBaseCalculo=v;} public BigDecimal getComissaoRepassePctAplicado(){return comissaoRepassePctAplicado;} public void setComissaoRepassePctAplicado(BigDecimal v){comissaoRepassePctAplicado=v;}
    public Boolean getComissaoSobreAcrescimosAplicada(){return comissaoSobreAcrescimosAplicada;} public void setComissaoSobreAcrescimosAplicada(Boolean v){comissaoSobreAcrescimosAplicada=v;} public BigDecimal getAcrescimosRecebidos(){return acrescimosRecebidos;} public void setAcrescimosRecebidos(BigDecimal v){acrescimosRecebidos=v;}
    public BigDecimal getComissaoTeorica(){return comissaoTeorica;} public void setComissaoTeorica(BigDecimal v){comissaoTeorica=v;} public BigDecimal getSaldoComissaoApos(){return saldoComissaoApos;} public void setSaldoComissaoApos(BigDecimal v){saldoComissaoApos=v;}
    public boolean isEstornado(){return estornado;} public void setEstornado(boolean v){estornado=v;} public LocalDateTime getEstornadoEm(){return estornadoEm;} public void setEstornadoEm(LocalDateTime v){estornadoEm=v;}
    public Long getEstornadoPorUsuarioId(){return estornadoPorUsuarioId;} public void setEstornadoPorUsuarioId(Long v){estornadoPorUsuarioId=v;} public LocalDateTime getCriadoEm(){return criadoEm;}
}
