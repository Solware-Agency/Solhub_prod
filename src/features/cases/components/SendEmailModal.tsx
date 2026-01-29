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
}) => {
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [newCcEmail, setNewCcEmail] = useState('');
  const [newBccEmail, setNewBccEmail] = useState('');
  const [emailHistory, setEmailHistory] = useState<EmailSendLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl bg-white/60 dark:bg-background/30 backdrop-blur-[2px] dark:backdrop-blur-[10px]'>
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
