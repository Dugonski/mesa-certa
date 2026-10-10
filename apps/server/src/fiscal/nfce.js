import { itemTotalCents } from "../../../../packages/shared/money.js";
export const escapeXml = (value) =>
  String(value).replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );
const onlyDigits = (value, length, fallback) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === length ? digits : fallback;
};
const value = (amount) => (amount / 100).toFixed(2);
const nfeDate = (input) => {
  const local = new Date(new Date(input).getTime() - 3 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
};
const accessDigit = (base) => {
  let weight = 2;
  let total = 0;
  for (let index = base.length - 1; index >= 0; index--) {
    total += Number(base[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const digit = 11 - (total % 11);
  return digit === 10 || digit === 11 ? 0 : digit;
};

export function fiscalConfigFromEnv(env = process.env) {
  return {
    cnpj: onlyDigits(env.FISCAL_CNPJ, 14, "00000000000000"),
    ie: onlyDigits(env.FISCAL_IE, 10, "0000000000"),
    legalName: env.FISCAL_RAZAO_SOCIAL || "EMITENTE NAO CONFIGURADO",
    tradeName: env.FISCAL_NOME_FANTASIA || "MESACERTA",
    street: env.FISCAL_LOGRADOURO || "ENDERECO NAO CONFIGURADO",
    number: env.FISCAL_NUMERO || "0",
    district: env.FISCAL_BAIRRO || "NAO CONFIGURADO",
    cityCode: onlyDigits(env.FISCAL_CODIGO_MUNICIPIO, 7, "4106902"),
    city: env.FISCAL_MUNICIPIO || "CURITIBA",
    state: env.FISCAL_UF || "PR",
    zipCode: onlyDigits(env.FISCAL_CEP, 8, "80000000"),
  };
}

// Produces an unsigned NFC-e 4.00 pre-authorization document. Fiscal product
// classification remains provisional until NCM/CFOP/tax rules are configured.
export function makeNfceXml(tab, payment, fiscal = fiscalConfigFromEnv({})) {
  const issuedAt = nfeDate(payment.createdAt);
  const yearMonth = issuedAt.slice(2, 4) + issuedAt.slice(5, 7);
  const invoiceNumber = String(tab.number).slice(-9).padStart(9, "0");
  const numericCode = String(tab.number).slice(-8).padStart(8, "0");
  const keyBase = `41${yearMonth}${fiscal.cnpj}65${"1".padStart(3, "0")}${invoiceNumber}1${numericCode}`;
  const digit = accessDigit(keyBase);
  const accessKey = `${keyBase}${digit}`;
  const total = value(payment.amountCents);
  const items = tab.items
    .map((item, index) => {
      const weighted = item.saleType === "WEIGHT";
      const unit = weighted ? "KG" : "UN";
      const quantity = weighted
        ? (item.weightGrams / 1000).toFixed(4)
        : Number(item.quantity).toFixed(4);
      const unitValue = (item.unitPriceCents / 100).toFixed(10);
      const itemValue = value(itemTotalCents(item));
      const additional = item.note
        ? `\n      <infAdProd>${escapeXml(item.note)}</infAdProd>`
        : "";
      return `    <det nItem="${index + 1}">
      <prod>
        <cProd>${escapeXml(item.productId ?? item.id ?? index + 1)}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${escapeXml(item.productName)}</xProd>
        <NCM>00000000</NCM>
        <CFOP>5102</CFOP>
        <uCom>${unit}</uCom>
        <qCom>${quantity}</qCom>
        <vUnCom>${unitValue}</vUnCom>
        <vProd>${itemValue}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${unit}</uTrib>
        <qTrib>${quantity}</qTrib>
        <vUnTrib>${unitValue}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <vTotTrib>0.00</vTotTrib>
        <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
        <PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.0000</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
        <COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.0000</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>
      </imposto>${additional}
    </det>`;
    })
    .join("\n");
  const paymentXml =
    payment.method === "PIX"
      ? "<tPag>17</tPag>"
      : "<tPag>99</tPag><xPag>CARTAO</xPag>";
  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${accessKey}" versao="4.00">
    <ide>
      <cUF>41</cUF><cNF>${numericCode}</cNF><natOp>VENDA</natOp><mod>65</mod><serie>1</serie><nNF>${Number(invoiceNumber)}</nNF>
      <dhEmi>${issuedAt}</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>${fiscal.cityCode}</cMunFG><tpImp>4</tpImp>
      <tpEmis>1</tpEmis><cDV>${digit}</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres>
      <procEmi>0</procEmi><verProc>MesaCerta 0.5.0</verProc>
    </ide>
    <emit>
      <CNPJ>${fiscal.cnpj}</CNPJ><xNome>${escapeXml(fiscal.legalName)}</xNome><xFant>${escapeXml(fiscal.tradeName)}</xFant>
      <enderEmit><xLgr>${escapeXml(fiscal.street)}</xLgr><nro>${escapeXml(fiscal.number)}</nro><xBairro>${escapeXml(fiscal.district)}</xBairro><cMun>${fiscal.cityCode}</cMun><xMun>${escapeXml(fiscal.city)}</xMun><UF>${escapeXml(fiscal.state)}</UF><CEP>${fiscal.zipCode}</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit>
      <IE>${fiscal.ie}</IE><CRT>1</CRT>
    </emit>
${items}
    <total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>${total}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>${total}</vNF><vTotTrib>0.00</vTotTrib></ICMSTot></total>
    <transp><modFrete>9</modFrete></transp>
    <pag><detPag><indPag>0</indPag>${paymentXml}<vPag>${total}</vPag></detPag><vTroco>0.00</vTroco></pag>
    <infAdic><infCpl>Ficha ${tab.number} - ${escapeXml(tab.label)}. XML de pre-autorizacao em homologacao; classificacao fiscal provisoria. Documento ainda sem assinatura digital, protocolo ou autorizacao da SEFAZ.</infCpl></infAdic>
  </infNFe>
</NFe>
`;
}
