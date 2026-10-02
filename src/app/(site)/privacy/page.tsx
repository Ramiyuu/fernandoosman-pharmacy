import type { Metadata } from 'next';
import Link from 'next/link';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { contactRetentionDays, describeRetention } from '@/config/privacy';
import { buildMetadata } from '@/lib/seo/metadata';
import { getSiteProfile } from '@/services/public-content.service';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy notice',
  description:
    'What personal data this site collects, why, for how long, and how to exercise your rights under the LGPD.',
  path: '/privacy',
});

const LAST_UPDATED = { pt: '2 de outubro de 2026', en: '2 October 2026' };

/**
 * Privacy notice (LGPD, Lei 13.709/2018). Every statement here describes what
 * the code actually does; update this page whenever data handling changes.
 */
export default async function PrivacyPage() {
  const profile = await getSiteProfile();
  const owner = profile?.full_name || 'o autor deste site';
  const email = profile?.professional_email;
  const retention = contactRetentionDays();
  const contactLine = email ? (
    <>
      pelo e-mail <a href={`mailto:${email}`}>{email}</a> ou pelo <Link href="/contact">formulário de contato</Link>
    </>
  ) : (
    <>
      pelo <Link href="/contact">formulário de contato</Link>
    </>
  );

  return (
    <Container>
      <PageHeader
        title="Privacy notice"
        description="Política de privacidade (LGPD) em português, com um resumo em inglês no final."
      />

      <article lang="pt-BR" className="article-body mt-10 max-w-[68ch]">
        <p>
          <em>Última atualização: {LAST_UPDATED.pt}.</em>
        </p>

        <h2>Quem é o controlador</h2>
        <p>
          Este é um site pessoal de portfólio e divulgação científica mantido por {owner}, que decide como os dados
          descritos abaixo são tratados (controlador, art. 5º, VI, da LGPD). Para qualquer assunto sobre privacidade,
          fale {contactLine}.
        </p>

        <h2>O que coletamos e por quê</h2>
        <h3>Ao navegar</h3>
        <p>
          Você pode ler todo o site sem criar conta. Usamos analytics interno para contar leituras e downloads, sem
          publicidade ou fingerprinting. O identificador aleatório de leitura fica no sessionStorage desta aba.
          Downloads usam um cookie HttpOnly por até 24 horas. No banco, registramos somente um hash diário desse
          identificador, o conteúdo e o horário; não registramos IP, navegador ou URL de origem junto ao evento. Eventos
          são excluídos após 365 dias pela rotina de manutenção. Respeitamos Do Not Track. As fontes e as imagens são
          servidas pelo próprio site.
        </p>
        <p>
          Como qualquer servidor, a hospedagem registra dados técnicos da conexão (endereço IP, navegador, página e
          horário) para funcionar e se proteger de abusos. O site também conta tentativas de envio de formulário, de
          download e de login para bloquear ataques automatizados. Para isso, o IP é guardado apenas como um código
          irreversível (hash com chave secreta), por pouco tempo, e nunca junto com outros dados seus. Base legal:
          legítimo interesse na segurança do site (art. 7º, IX).
        </p>

        <h3>Ao enviar uma mensagem pelo formulário de contato</h3>
        <p>
          Guardamos o nome, o e-mail, o assunto e a mensagem que você escrever, e a data em que você aceitou este aviso.
          Esses dados servem apenas para responder a você e não são usados para marketing, compartilhados ou vendidos.
          Base legal: seu consentimento (art. 7º, I), que você pode retirar a qualquer momento. O IP não é guardado com
          a mensagem.
        </p>
        <p>
          As mensagens são apagadas automaticamente após {describeRetention(retention, 'pt')}, ou antes, se você pedir.
        </p>

        <h3>Downloads de PDF</h3>
        <p>
          Os PDFs públicos são entregues por links temporários (válidos por 60 segundos) gerados a cada clique.
          Visualizações e downloads são contados separadamente. Não registramos a identidade de quem baixou cada
          arquivo. Links assinados expiram, mas um arquivo já baixado continua com quem o recebeu.
        </p>

        <h2>Vídeos externos</h2>
        <p>
          Vídeos do YouTube só carregam depois que você clica em reproduzir. Ao fazer isso, seu navegador se conecta ao
          provedor externo, que aplica sua própria política de privacidade.
        </p>
        <h2>Com quem os dados são compartilhados</h2>
        <p>Os dados ficam em serviços contratados para operar o site (operadores, art. 5º, VII):</p>
        <ul>
          <li>Railway: hospedagem do site e do banco de dados;</li>
          <li>Cloudflare: armazenamento dos arquivos (R2) e, quando configurado, proteção de rede e DNS.</li>
        </ul>
        <p>
          Esses servidores podem ficar fora do Brasil (por exemplo, nos Estados Unidos ou na Europa). A transferência
          internacional segue o art. 33 da LGPD, com fornecedores que adotam cláusulas contratuais e medidas de
          segurança compatíveis. Nenhum dado é vendido ou cedido para outros fins.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode pedir, a qualquer momento e sem custo, a confirmação de que tratamos seus dados, o acesso a eles, a
          correção, a eliminação, informações sobre compartilhamento e a revogação do consentimento (art. 18). Escreva{' '}
          {contactLine}. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>

        <h2>Como protegemos os dados</h2>
        <ul>
          <li>Todo o tráfego usa HTTPS.</li>
          <li>
            Só o autor acessa o painel administrativo, com senha forte e verificação em duas etapas obrigatória. Não
            existe cadastro público.
          </li>
          <li>
            O banco de dados não fica exposto na internet, e cada consulta do site só enxerga o que precisa: visitantes
            nunca alcançam mensagens, rascunhos ou dados de login.
          </li>
          <li>Os arquivos ficam em armazenamento privado, e os registros técnicos não guardam e-mails nem IPs.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          Downloads utilizam um identificador aleatório em cookie HttpOnly de até 24 horas. A área administrativa usa
          cookies de sessão e verificação em duas etapas, estritamente necessários, apenas para o autor do site.
        </p>

        <h2>Conteúdo</h2>
        <p>
          Os artigos e documentos tratam de estudos publicados e não contêm dados de pacientes. O site não é direcionado
          a crianças e adolescentes.
        </p>

        <h2>Alterações</h2>
        <p>Se este aviso mudar, a data no topo será atualizada.</p>
      </article>

      <section
        lang="en"
        aria-labelledby="privacy-en"
        className="article-body mt-16 max-w-[68ch] border-t border-rule pt-10"
      >
        <h2 id="privacy-en">Summary in English</h2>
        <p>
          <em>Last updated: {LAST_UPDATED.en}.</em>
        </p>
        <ul>
          <li>
            No account is needed to read the site. Internal analytics count views and downloads using random temporary
            identifiers, without fingerprinting or storing IP addresses in events. Do Not Track is respected. External
            videos load only after you choose to play.
          </li>
          <li>
            The contact form stores your name, email, subject, message and the date you accepted this notice, only to
            reply to you (legal basis: consent). Messages are deleted automatically after {describeRetention(retention)}
            , or sooner on request.
          </li>
          <li>
            For security, sign-in, download and form attempts are counted against a keyed hash of your IP address, kept
            briefly and never linked to anything else.
          </li>
          <li>
            Data is processed by Railway (hosting, database) and Cloudflare (file storage), possibly outside Brazil
            (LGPD art. 33). Nothing is sold or shared for other purposes.
          </li>
          <li>
            To access, correct or delete your data, or to withdraw consent, use the{' '}
            <Link href="/contact">contact form</Link>
            {email ? (
              <>
                {' '}
                or email <a href={`mailto:${email}`}>{email}</a>
              </>
            ) : null}
            . You can also complain to Brazil&apos;s data protection authority (ANPD).
          </li>
        </ul>
      </section>
    </Container>
  );
}
