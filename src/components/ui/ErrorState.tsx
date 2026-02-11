import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  retry?: () => void;
}

export function ErrorState({ error, retry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Algo correu mal
      </h3>
      <p className="text-gray-600 mb-4 max-w-md">{error}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ 
  title, 
  description, 
  action 
}: { 
  title: string; 
  description?: string; 
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-4 max-w-md">{description}</p>
      )}
      {action}
    </div>
  );
}
