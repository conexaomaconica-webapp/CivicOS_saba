import type { ConnectionOrigin, ConnectionValueRange } from '@/app/actions/connections';

export const CONNECTION_ORIGIN_LABELS: Record<ConnectionOrigin, string> = {
  busca: 'Encontrei pela busca da Conexão',
  oferta: 'Vi uma oferta ou benefício',
  indicacao: 'Recebi uma indicação',
  evento: 'Conheci em um evento da Conexão',
  compartilhamento: 'Compartilharam o perfil comigo',
  qr_empresa: 'Li o QR Code da empresa',
  ja_conhecia: 'Já conhecia a empresa',
  outro: 'Outro',
};

export const CONNECTION_VALUE_LABELS: Record<ConnectionValueRange, string> = {
  ate_250: 'Até R$ 250',
  '251_500': 'R$ 251 a R$ 500',
  '501_1000': 'R$ 501 a R$ 1.000',
  '1001_5000': 'R$ 1.001 a R$ 5.000',
  acima_5000: 'Acima de R$ 5.000',
  nao_informar: 'Prefiro não informar',
};
