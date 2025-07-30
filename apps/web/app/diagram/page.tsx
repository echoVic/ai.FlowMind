import DiagramGenerator from '@/components/diagram/DiagramGenerator';

export default function DiagramPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">FlowMind Diagram Generator</h1>
      <DiagramGenerator />
    </div>
  );
}