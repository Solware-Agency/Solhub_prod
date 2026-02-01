import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shared/components/ui/dialog';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Badge } from '@shared/components/ui/badge';
import { Mail, X, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { getEmailSendHistory, type EmailSendLog } from '@/services/supabase/email-logs/email-logs-service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emails: { to: string; cc: string[]; bcc: string[] }) => Promise<void>;
  primaryEmail: string;
  patientName: string;
  caseCode: string;
  caseId?: string;
  isSending: boolean;
  // Props para preview
  pdfUrl?: string | null;
  uploadedPdfUrl?: string | null;
  imageUrls?: string[];
  laboratoryName?: string;
  laboratoryLogo?: string;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  onSend,
  primaryEmail,
  patientName,
  caseCode,
  caseId,
  isSending,
  pdfUrl,
  uploadedPdfUrl,
  imageUrls = [],
  laboratoryName = 'SolHub',
  laboratoryLogo,
}) => {
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [newBccEmail, setNewBccEmail] = useState('');
  const [emailHistory, setEmailHistory] = useState<EmailSendLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Cargar historial de envíos cuando se abre el modal
  useEffect(() => {
    const loadHistory = async () => {
      if (isOpen && caseId) {
        setIsLoadingHistory(true);
        const { data } = await getEmailSendHistory(caseId);
        setEmailHistory(data || []);
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [isOpen, caseId]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddCc = () => {
    if (newCcEmail && validateEmail(newCcEmail) && !ccEmails.includes(newCcEmail)) {
      setCcEmails([...ccEmails, newCcEmail]);
      setNewCcEmail('');
    }
  };

  const handleRemoveCc = (email: string) => {
    setCcEmails(ccEmails.filter((e) => e !== email));
  };

  const handleSend = async () => {
    await onSend({
      to: primaryEmail,
      cc: ccEmails,
      bcc: [],
    });
    // Reset state
    setCcEmails([]);
    setNewCcEmail('');
  };

  const handleKeyDownCc = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCc();
    }
  };

  // Generar HTML del preview
  const generatePreviewHtml = () => {
    const defaultLogo = 'https://lafysstpyiejevhrlmzc.supabase.co/storage/v1/object/public/imagenes/Conspat/Logo%20Conspat%20blanco%20sin%20fondo%20(1).png';
    const logoUrl = laboratoryLogo || defaultLogo;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <img src="${logoUrl}" alt="${laboratoryName}" style="height: 80px; width: auto; display: block; margin: 0 auto 15px auto;" />
          <p style="margin: 0; opacity: 0.9; font-size: 16px;">Su informe médico está listo</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Estimado/a <strong style="color: #667eea;">${patientName}</strong>,
          </p>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Le informamos que ${pdfUrl ? 'su informe médico del' : 'la información del'} <strong>Caso ${caseCode}</strong> está ${pdfUrl ? 'lista para descarga' : 'disponible'}.
          </p>

          <div style="text-align: center; margin: 40px 0;">
            ${pdfUrl ? `
              <a href="${pdfUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    display: inline-block;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                📄 Descargar Informe
              </a>
            ` : ''}
            
            ${uploadedPdfUrl ? `
              <br><br>
              <a href="${uploadedPdfUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    display: inline-block;
                    font-weight: bold;
                    font-size: 16px;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                📎 Adjunto
              </a>
            ` : ''}
          </div>

          ${imageUrls.length > 0 ? `
            <div style="margin-top: 30px;">
              <h3 style="color: #667eea; font-size: 18px; margin-bottom: 15px;">📷 Imágenes adjuntas</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                ${imageUrls.map((url, index) => `
                  <div style="text-align: center;">
                    <a href="${url}" target="_blank" style="text-decoration: none;">
                      <img src="${url}" alt="Imagen ${index + 1}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;" />
                      <p style="color: #667eea; font-size: 14px; margin-top: 5px; font-weight: 600;">Ver #${index + 1}</p>
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              Si tiene alguna consulta, no dude en contactarnos.
            </p>
          </div>

          <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ${laboratoryName}. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    `;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto bg-white/60 dark:bg-background/30 backdrop-blur-[2px] dark:backdrop-blur-[10px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Mail className='w-5 h-5' />
            Enviar informe por correo
          </DialogTitle>
          <DialogDescription className='flex items-center gap-2'>
            <Badge variant='secondary'>{caseCode}</Badge>
            <span>{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className='flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4'>
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Destinatarios
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Vista previa
          </button>
        </div>

        {/* Contenido según tab activo */}
        {activeTab === 'form' ? (
          <div className='space-y-4 py-4'>
          {/* Historial de envíos anteriores */}
          {caseId && emailHistory.length > 0 && (
            <div className='bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center gap-2 mb-2'>
                <Clock className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                <h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>
                  Envíos anteriores ({emailHistory.length})
                </h4>
              </div>
              <div className='space-y-2 max-h-32 overflow-y-auto'>
                {emailHistory.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className='flex items-start justify-between text-xs bg-white dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700'
                  >
                    <div className='flex items-start gap-2 flex-1'>
                      {log.status === 'success' ? (
                        <CheckCircle2 className='w-3 h-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0' />
                      ) : (
                        <XCircle className='w-3 h-3 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0' />
                      )}
                      <div className='flex-1 min-w-0'>
                        <p className='text-gray-700 dark:text-gray-300 truncate'>
                          {log.recipient_email}
                        </p>
                        <p className='text-gray-500 dark:text-gray-400'>
                          {format(new Date(log.sent_at), "d 'de' MMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {emailHistory.length > 3 && (
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-2 text-center'>
                  +{emailHistory.length - 3} envío(s) más
                </p>
              )}
            </div>
          )}
          {/* Destinatario principal */}
          <div className='space-y-2'>
            <Label htmlFor='primary-email'>Destinatario principal</Label>
            <Input
              id='primary-email'
              type='email'
              value={primaryEmail}
              disabled
              className='bg-gray-50 dark:bg-gray-800'
            />
          </div>

          {/* CC */}
          <div className='space-y-2'>
            <Label htmlFor='cc-email'>
              CC (Con copia) - Opcional
            </Label>
            <div className='flex gap-2'>
              <Input
                id='cc-email'
                type='email'
                placeholder='email@ejemplo.com'
                value={newCcEmail}
                onChange={(e) => setNewCcEmail(e.target.value)}
                onKeyDown={handleKeyDownCc}
              />
              <Button
                type='button'
                onClick={handleAddCc}
                disabled={!newCcEmail || !validateEmail(newCcEmail)}
                size='sm'
              >
                <Plus className='w-4 h-4' />
              </Button>
            </div>
            {ccEmails.length > 0 && (
              <div className='flex flex-wrap gap-2 mt-2'>
                {ccEmails.map((email) => (
                  <div
                    key={email}
                    className='flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-sm'
                  >
                    <Mail className='w-3 h-3' />
                    <span>{email}</span>
                    <button
                      onClick={() => handleRemoveCc(email)}
                      className='ml-1 hover:text-blue-600'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className='bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm'>
            <p className='text-gray-700 dark:text-gray-300'>
              <strong>CC:</strong> Los destinatarios pueden ver quién más recibió el correo.
            </p>
          </div>
        </div>
        ) : (
          /* Vista previa del email */
          <div className='py-4'>
            <div className='bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border border-gray-300 dark:border-gray-700'>
              <div 
                dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                className='email-preview'
              />
            </div>
          </div>
        )}

        <div className='flex justify-end gap-3'>
          <Button variant='outline' onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? 'Enviando...' : 'Enviar correo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailModal;
