# Clube de Conexões — Produção Stripe Billing + Connect

**Definição comercial fornecida pelo proprietário**
- Produto independente da SEED: Clube de Conexões.
- Única assinatura de R$ 69,00 BRL por mês; mesma mensalidade para todos os membros.
- Benefícios: aulas online quinzenais, networking, comunidade e oportunidades de eventos (sem prometer acesso garantido).
- Split acordado: 50% do valor BRUTO da mensalidade à sócia Taynara, 50% BRUTO ao Clube, antes das taxas.
- Tributos ainda não definidos. **Não ativar Stripe Tax automaticamente nem declarar NFS-e emitida pela Stripe.**
- Implementar somente quando a conta Stripe de produção for acessível e estiver apta a operar Connect.

## Situação da conexão no último acesso (2026-11-16)
A conexão ChatGPT Stripe disponibilizou somente `acct_1UcA6k5jifGnwLNM` com `livemode=false`. Nenhum produto foi criado em produção, nem conta conectada ou repasse.

## Arquitetura recomendada
1. Na conta real do Clube, criar um único **Product** `Clube de Conexões`, tipo serviço de comunidade, com descrição fiel à proposta.
2. Criar um **Price** associado, `currency=brl`, `unit_amount=6900`, `recurring.interval=month`. Evitar promoções, diferentes lotes e trials.
3. Ativar e verificar a elegibilidade de **Stripe Connect** na conta real; configurar onboarding para a Taynara, com identidade e conta bancária informadas diretamente à Stripe. Não recolher dados bancários no chat ou no repositório.
4. Escolher **destination charges** para que a plataforma Clube seja o merchant of record, sem `on_behalf_of` para não transferir essa posição à Taynara.
5. Após a conta conectada ter as capabilities relevantes habilitadas, criar as assinaturas com:
   - `transfer_data.destination = <conta conectada da Taynara>`;
   - `application_fee_percent = 50` para retenção de 50% bruto na plataforma;
   - valor mensal cobrado de R$ 69,00 ao cliente;
   - `automatic_tax.enabled = false` até revisão tributária e fiscal.
6. No fluxo de checkout hospedado, verificar compatibilidade com `subscription_data` da API/SDK vigente. Nunca aceitar destino ou percentual do browser: definir ambos no servidor.
7. Confirmar o processamento dos eventos `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted` antes de liberar acesso à comunidade.
8. Conciliar por invoice/charge/transfer/application fee no banco, tratando idempotência, disputas, refunds e transfer reversals.
9. Definir com a contabilidade quem é a entidade vendedora, responsabilidade de NFS-e, tributação e tratamento de receita de coprodução.

## Fluxo econômico ilustrativo (valor de R$ 69)
- Entrada bruta: R$ 69,00.
- Parcela bruta destinada à Taynara: R$ 34,50.
- Parcela bruta retida no Clube: R$ 34,50.
- Nas destination charges, taxas de processamento, refunds e chargebacks são debitados à plataforma Clube (ver documentação oficial). Portanto o saldo líquido do Clube será inferior a R$ 34,50 se a comissão continuar sendo 50% do bruto.
- Depósito instantâneo em banco brasileiro **não é garantido nem oferecido via Connect Instant Payouts** no rol atual de países elegíveis. Transferência ao saldo Stripe e payout bancário são etapas diferentes.

## Gatilhos para habilitar produção
- [ ] Acesso Stripe com `livemode=true`, consentimento e permissões adequadas.
- [ ] Elegibilidade Connect confirmada e conta conectada de Taynara completamente validada.
- [ ] Escolha informada do responsável por taxas, chargebacks e estornos no contrato entre as partes.
- [ ] Produto e preço criados em produção e IDs guardados nos secrets do servidor.
- [ ] Site oficial e domínio de retorno definidos (o SEED CRM existente é infraestrutura técnica, não identidade do Clube).
- [ ] Revisão fiscal Brasil (ISS/NFS-e, e eventual tributação internacional), termos de assinatura, cancelamento e privacidade.
- [ ] Testes de pagamento, falha, renovação, reembolso e reconciliação concluídos sem afetar a `main`.
- [ ] PR revisado; configurar deploy de produção só depois de aprovação.

Referências:
- https://docs.stripe.com/connect/subscriptions
- https://docs.stripe.com/connect/instant-payouts
- https://docs.stripe.com/connect/charges
