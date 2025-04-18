// utils/parseCAE.js
const { parseString } = require('xml2js');

function extraerCAE(xmlResponse) {
  return new Promise((resolve, reject) => {
    parseString(xmlResponse, (err, result) => {
      if (err) return reject(err);

      try {
        const response = result['soap:Envelope']['soap:Body'][0].FECAESolicitarResponse[0].FECAESolicitarResult[0];
        
        // Verificar errores
        const errors = response.Errors?.[0]?.Err?.[0]?.map(err => ({
          code: err.Code[0],
          msg: err.Msg[0]
        })) || [];
        
        if (errors.length > 0) {
          return reject(new Error(errors.map(e => `${e.code}: ${e.msg}`).join('; ')));
        }

        const cae = response.FeDetResp[0].FECAEDetResponse[0].CAE[0];
        const caeVto = response.FeDetResp[0].FECAEDetResponse[0].CAEFchVto[0];
        const observaciones = response.FeDetResp[0].FECAEDetResponse[0].Observaciones?.[0]?.Obs?.[0]?.Msg?.[0];

        resolve({ cae, caeVto, observaciones });
      } catch (e) {
        reject(new Error('Estructura de respuesta inválida'));
      }
    });
  });
}

module.exports = { extraerCAE };