import Bluebird, { reject } from 'bluebird';
import agent from 'superagent';
import promisifyAgent from 'superagent-promise';

const request = promisifyAgent(agent, Bluebird);
const routeDirectCall = pathDirectCall => `https://api.directcallsoft.com${path}`;
const routeTotalVoice = pathTotalVoice => `https://api.totalvoice.com.br${path}`;

const gemidaoInText = 'OOOWH AHHHWN WOOOO AAAAHN WAAAAA AAAAAAHN ANN WAAA!\n'
    + 'Voce caiu no gemidao do zap';

// TotalVoice
const smsTotalVoice = (to, token) => request.post(routeTotalVoice('/sms'))
    .set('Access-Token', token)
    .set('Accept', 'application/json')
    .send({ numero_destino: to, mensagem: gemidaoInText });

const callTotalVoice = (from, to, token) => request.post(routeTotalVoice('/composto'))
    .set('Access-Token', token)
    .set('Accept', 'application/json')
    .send({
        numero_destino: to,
        dados: [
            {
                acao: 'audio',
                acao_dados: {
                    url_audio: 'https://github.com/haskellcamargo/gemidao-do-zap/raw/master/resources/gemidao.mp3'
                }
            }
        ],
        bina: from
    });

// DirectCall
const smsDirectCall = (from, to, token) => request.post(route('/sms/send'))
    .set('Accept', 'application/json')
    .send({
        origem: from,
        access_token: token,
        destino: to,
        texto: gemidaoInText
    });

const callDirectCall = (from, to, token) => request.post(route('/sms/audio'))
    .set('Access-Token', token)
    .set('Accept', 'application/json')
    .send({
        access_token: token,
        audio: 'https://github.com/haskellcamargo/gemidao-do-zap/raw/master/resources/gemidao.mp3'
    });

// Comum
export default function gemidao(args) {
    if (!/^[a-f0-9]{45}$/.test(args.token)) {
        return reject(new Error('Token inválido. Obtenha um em https://www.directcallsoft.com'));
    }

    if (!/^[0-9]{10,11}$/.test(args.para)) {
        return reject(new Error('Número de telefone inválido'));
    }

    switch(args.api) {
        case "TotalVoice":
            const action = args.sms
                ? smsTotalVoice(args.de, args.para, args.token)
                : callTotalVoice(args.de, args.para, args.token);
            break;
        case "DirectCall":
            const action = args.sms
                ? smsDirectCall(args.de, args.para, args.token)
                : callDirectCall(args.de, args.para, args.token);
            break;
        default:
            return reject(new Error('Escolha uma das APIs Suportadas: DirectCall ou TotalVoice.'));
    }

    return action
        .catch(err => {
            if (err.status === 405 || err.status === 403) {
                return reject(new Error((err.body || err.response.body).mensagem));
            }

            return reject(err);
        });
}
