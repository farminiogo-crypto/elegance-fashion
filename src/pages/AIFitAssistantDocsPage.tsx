import AIFitAssistantDocs from '../components/AIFitAssistantDocs';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AIFitAssistantDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="pt-20 pb-12">
        <AIFitAssistantDocs />
      </div>
      <Footer />
    </div>
  );
}

