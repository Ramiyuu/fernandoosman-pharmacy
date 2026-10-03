import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/section-header';
import { contactRetentionDays, describeRetention } from '@/config/privacy';
import { isLocale } from '@/i18n/config';
import { i18nFor } from '@/i18n/server';
import { buildMetadata } from '@/lib/seo/metadata';
import { getSiteProfile } from '@/services/public-content.service';

export async function generateMetadata({ params }: PageProps<'/[lang]/privacy'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const { t } = i18nFor(lang);
  return buildMetadata({ title: t.privacy.title, description: t.privacy.description, path: '/privacy', locale: lang });
}

const LAST_UPDATED = { pt: '2 de outubro de 2026', en: '2 October 2026' };

interface NoticeProps {
  owner: string;
  email: string | null | undefined;
  contactHref: string;
  retentionDays: number;
}

/**
 * Privacy notice (LGPD, Lei 13.709/2018). Every statement here describes what
 * the code actually does; update both versions whenever data handling changes.
 * The Portuguese text is the reference; the English one translates it.
 */
export default async function PrivacyPage({ params }: PageProps<'/[lang]/privacy'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { href } = i18nFor(lang);
  const profile = await getSiteProfile(lang);
  const props: NoticeProps = {
    owner: profile?.full_name || (lang === 'pt' ? 'o autor deste site' : 'the author of this site'),
    email: profile?.professional_email,
    contactHref: href('/contact'),
    retentionDays: contactRetentionDays(),
  };

  return (
    <Container>
      {lang === 'pt' ? (
        <>
          <PageHeader title="Aviso de privacidade" description="Política de privacidade deste site, conforme a LGPD." />
          <NoticePt {...props} />
        </>
      ) : (
        <>
          <PageHeader
            title="Privacy notice"
            description="This site's privacy policy under Brazil's data protection law (LGPD). The Portuguese version is the reference text."
          />
          <NoticeEn {...props} />
        </>
      )}
    </Container>
  );
}

function NoticePt({ owner, email, contactHref, retentionDays }: NoticeProps) {
  const contactLine: ReactNode = email ? (
    <>
      pelo e-mail <a href={`mailto:${email}`}>{email}</a> ou pelo <Link href={contactHref}>formulário de contato</Link>
    </>
  ) : (
    <>
      pelo <Link href={contactHref}>formulário de contato</Link>
    </>
  );

  return (
    <article lang="pt-BR" className="article-body mt-10 max-w-[68ch]">
      <p>
        <em>Última atualização: {LAST_UPDATED.pt}.</em>
      </p>

      <h2>Quem é o controlador</h2>
      <p>
        Este é um site pessoal de portfólio e divulgação científica mantido por {owner}, que decide como os dados
        descritos abaixo são tratados (controlador, art. 5º, VI, da LGPD). Para qualquer assunto sobre privacidade, fale{' '}
        {contactLine}.
      </p>

      <h2>O que coletamos e por quê</h2>
      <h3>Ao navegar</h3>
      <p>
        Você pode ler todo o site sem criar conta. Usamos analytics interno para contar leituras e downloads, sem
        publicidade ou fingerprinting. O identificador aleatório de leitura fica no sessionStorage desta aba. Downloads
        usam um cookie HttpOnly por até 24 horas. No banco, registramos somente um hash diário desse identificador, o
        conteúdo e o horário; não registramos IP, navegador ou URL de origem junto ao evento. Eventos são excluídos após
        365 dias pela rotina de manutenção. Respeitamos Do Not Track. As fontes e as imagens são servidas pelo próprio
        site.
      </p>
      <p>
        Como qualquer servidor, a hospedagem registra dados técnicos da conexão (endereço IP, navegador, página e
        horário) para funcionar e se proteger de abusos. O site também conta tentativas de envio de formulário, de
        download e de login para bloquear ataques automatizados. Para isso, o IP é guardado apenas como um código
        irreversível (hash com chave secreta), por pouco tempo, e nunca junto com outros dados seus. Base legal: legítimo
        interesse na segurança do site (art. 7º, IX).
      </p>

      <h3>Ao enviar uma mensagem pelo formulário de contato</h3>
      <p>
        Guardamos o nome, o e-mail, o assunto e a mensagem que você escrever, e a data em que você aceitou este aviso.
        Esses dados servem apenas para responder a você e não são usados para marketing, compartilhados ou vendidos. Base
        legal: seu consentimento (art. 7º, I), que você pode retirar a qualquer momento. O IP não é guardado com a
        mensagem.
      </p>
      <p>As mensagens são apagadas automaticamente após {describeRetention(retentionDays, 'pt')}, ou antes, se você pedir.</p>

      <h3>Downloads de PDF</h3>
      <p>
        Os PDFs públicos são entregues por links temporários (válidos por 60 segundos) gerados a cada clique.
        Visualizações e downloads são contados separadamente. Não registramos a identidade de quem baixou cada arquivo.
        Links assinados expiram, mas um arquivo já baixado continua com quem o recebeu.
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
        internacional segue o art. 33 da LGPD, com fornecedores que adotam cláusulas contratuais e medidas de segurança
        compatíveis. Nenhum dado é vendido ou cedido para outros fins.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir, a qualquer momento e sem custo, a confirmação de que tratamos seus dados, o acesso a eles, a
        correção, a eliminação, informações sobre compartilhamento e a revogação do consentimento (art. 18). Escreva{' '}
        {contactLine}. Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados
        (ANPD).
      </p>

      <h2>Como protegemos os dados</h2>
      <ul>
        <li>Todo o tráfego usa HTTPS.</li>
        <li>
          Só o autor acessa o painel administrativo, com senha forte e verificação em duas etapas obrigatória. Não existe
          cadastro público.
        </li>
        <li>
          O banco de dados não fica exposto na internet, e cada consulta do site só enxerga o que precisa: visitantes nunca
          alcançam mensagens, rascunhos ou dados de login.
        </li>
        <li>Os arquivos ficam em armazenamento privado, e os registros técnicos não guardam e-mails nem IPs.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Downloads utilizam um identificador aleatório em cookie HttpOnly de até 24 horas. Se você escolher um idioma no
        seletor EN/PT, um cookie de preferência (fo-locale) guarda essa escolha por até 12 meses, apenas para abrir o site
        no idioma certo. A área administrativa usa cookies de sessão e verificação em duas etapas, estritamente
        necessários, apenas para o autor do site.
      </p>

      <h2>Conteúdo</h2>
      <p>
        Os artigos e documentos tratam de estudos publicados e não contêm dados de pacientes. O site não é direcionado a
        crianças e adolescentes.
      </p>

      <h2>Alterações</h2>
      <p>Se este aviso mudar, a data no topo será atualizada.</p>
    </article>
  );
}

function NoticeEn({ owner, email, contactHref, retentionDays }: NoticeProps) {
  const contactLine: ReactNode = email ? (
    <>
      by email at <a href={`mailto:${email}`}>{email}</a> or through the <Link href={contactHref}>contact form</Link>
    </>
  ) : (
    <>
      through the <Link href={contactHref}>contact form</Link>
    </>
  );

  return (
    <article lang="en" className="article-body mt-10 max-w-[68ch]">
      <p>
        <em>Last updated: {LAST_UPDATED.en}.</em>
      </p>

      <h2>Who is responsible</h2>
      <p>
        This is a personal portfolio and science communication site run by {owner}, who decides how the data described
        below is processed (controller, LGPD art. 5, VI). For any privacy matter, get in touch {contactLine}.
      </p>

      <h2>What we collect and why</h2>
      <h3>While you browse</h3>
      <p>
        You can read the whole site without an account. Internal analytics count views and downloads, with no
        advertising or fingerprinting. The random reading identifier lives in this tab&apos;s sessionStorage. Downloads use
        an HttpOnly cookie for up to 24 hours. The database stores only a daily hash of that identifier, the content and
        the time; no IP address, browser or referring URL is stored with the event. Events are deleted after 365 days by
        the maintenance routine. Do Not Track is respected. Fonts and images are served by the site itself.
      </p>
      <p>
        Like any server, the hosting provider logs technical connection data (IP address, browser, page and time) to run
        and to protect itself from abuse. The site also counts form, download and sign-in attempts to block automated
        attacks. For that, the IP address is kept only as an irreversible code (a keyed hash), briefly, and never together
        with any other data about you. Legal basis: legitimate interest in the site&apos;s security (art. 7, IX).
      </p>

      <h3>When you send a message through the contact form</h3>
      <p>
        We store the name, email address, subject and message you write, and the date you accepted this notice. This data
        is used only to reply to you; it is never used for marketing, shared or sold. Legal basis: your consent (art. 7,
        I), which you can withdraw at any time. The IP address is not stored with the message.
      </p>
      <p>Messages are deleted automatically after {describeRetention(retentionDays, 'en')}, or sooner if you ask.</p>

      <h3>PDF downloads</h3>
      <p>
        Public PDFs are delivered through temporary links (valid for 60 seconds) created on each click. Views and
        downloads are counted separately. The identity of whoever downloaded a file is not recorded. Signed links expire,
        but a file that has already been downloaded stays with whoever received it.
      </p>

      <h2>External videos</h2>
      <p>
        YouTube videos load only after you click play. When you do, your browser connects to the external provider, which
        applies its own privacy policy.
      </p>
      <h2>Who the data is shared with</h2>
      <p>The data is kept by services hired to run the site (processors, art. 5, VII):</p>
      <ul>
        <li>Railway: hosting for the site and the database;</li>
        <li>Cloudflare: file storage (R2) and, when configured, network protection and DNS.</li>
      </ul>
      <p>
        These servers may be outside Brazil (for example in the United States or Europe). International transfers follow
        LGPD art. 33, with providers that adopt contractual clauses and compatible security measures. No data is sold or
        handed over for other purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        At any time and free of charge, you can ask for confirmation that we process your data, access to it, correction,
        deletion, information about sharing, and withdrawal of consent (art. 18). Write {contactLine}. We reply within 15
        days. You can also complain to Brazil&apos;s data protection authority (ANPD).
      </p>

      <h2>How the data is protected</h2>
      <ul>
        <li>All traffic uses HTTPS.</li>
        <li>
          Only the author can reach the admin panel, with a strong password and mandatory two-step verification. There is
          no public sign-up.
        </li>
        <li>
          The database is not exposed to the internet, and each query the site makes sees only what it needs: visitors
          never reach messages, drafts or sign-in data.
        </li>
        <li>Files are kept in private storage, and technical logs store neither email addresses nor IP addresses.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Downloads use a random identifier in an HttpOnly cookie for up to 24 hours. If you pick a language in the EN/PT
        switcher, a preference cookie (fo-locale) remembers that choice for up to 12 months, only to open the site in the
        right language. The admin area uses strictly necessary session and two-step verification cookies, for the site&apos;s
        author only.
      </p>

      <h2>Content</h2>
      <p>
        Articles and documents discuss published studies and contain no patient data. The site is not aimed at children or
        teenagers.
      </p>

      <h2>Changes</h2>
      <p>If this notice changes, the date at the top will be updated.</p>
    </article>
  );
}
