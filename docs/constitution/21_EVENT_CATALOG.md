# 21. EVENT CATALOG

O Event Catalog é o contrato oficial dos eventos de domínio do ecossistema CivicOS. 
Nenhum evento pode ser disparado sem constar neste documento e sem obedecer ao esquema do respectivo `EventEnvelope`.

## 1. Regras do Catálogo

- Todo evento de domínio trafega em um `EventEnvelope<T>`.
- Os eventos devem usar o verbo no passado (ex: `company.created`, não `company.create`).
- Plugins produtores de um evento assumem o compromisso de não alterar o schema do evento quebrando retrocompatibilidade (utiliza-se versionamento).

## 2. Eventos Core (business-directory)

### `company.created`
- **Producer**: `business-directory`
- **Description**: Emitido quando uma nova empresa é registrada com sucesso no diretório.
- **Payload (`CompanyCreatedV1`)**:
  ```typescript
  interface CompanyCreatedV1 {
    readonly companyId: string;
    readonly name: string;
    readonly category: string;
    readonly plan: string;
  }
  ```

### `company.updated`
- **Producer**: `business-directory`
- **Description**: Emitido quando os dados públicos de uma empresa são alterados.
- **Payload (`CompanyUpdatedV1`)**:
  ```typescript
  interface CompanyUpdatedV1 {
    readonly companyId: string;
    readonly changedFields: string[];
  }
  ```

### `company.deleted`
- **Producer**: `business-directory`
- **Description**: Emitido quando uma empresa é suspensa ou excluída do diretório.
- **Payload (`CompanyDeletedV1`)**:
  ```typescript
  interface CompanyDeletedV1 {
    readonly companyId: string;
    readonly reason: string;
  }
  ```

## 3. Eventos Billing

### `subscription.expired`
- **Producer**: `billing`
- **Description**: Emitido quando a assinatura de um lojista/empresa expira e o pagamento falha após o período de carência.
- **Payload (`SubscriptionExpiredV1`)**:
  ```typescript
  interface SubscriptionExpiredV1 {
    readonly companyId: string;
    readonly planId: string;
    readonly expirationDate: string; // ISO 8601
  }
  ```

### `payment.confirmed`
- **Producer**: `billing`
- **Description**: Emitido quando uma fatura é paga com sucesso.
- **Payload (`PaymentConfirmedV1`)**:
  ```typescript
  interface PaymentConfirmedV1 {
    readonly companyId: string;
    readonly invoiceId: string;
    readonly amount: number;
    readonly currency: string;
  }
  ```
