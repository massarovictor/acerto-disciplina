import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getSchoolConfig,
  saveSchoolConfig,
  SchoolConfig,
  getDefaultConfig,
  uploadSchoolAsset,
  removeSchoolAsset,
  SCHOOL_ASSET_ALLOWED_MIME_TYPES,
  SCHOOL_ASSET_MAX_BYTES,
} from '@/lib/schoolConfig';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  X,
  Image as ImageIcon,
  FileSignature,
  RectangleHorizontal,
} from 'lucide-react';

interface SchoolConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCEPTED_IMAGE_TYPES = SCHOOL_ASSET_ALLOWED_MIME_TYPES.join(',');
const MAX_FILE_MB = (SCHOOL_ASSET_MAX_BYTES / (1024 * 1024)).toFixed(0);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () =>
      reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });

export const SchoolConfigDialog = ({
  open,
  onOpenChange,
}: SchoolConfigDialogProps) => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SchoolConfig>(getDefaultConfig());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadedConfigRef = useRef<SchoolConfig>(getDefaultConfig());
  const logoInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const loadConfig = async () => {
      try {
        const loadedConfig = await getSchoolConfig();
        loadedConfigRef.current = loadedConfig;
        setConfig(loadedConfig);
        setLogoFile(null);
        setFrameFile(null);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar as configurações salvas.',
        });
      }
    };

    loadConfig();
  }, [open, toast]);

  const validateImageFile = (file: File) => {
    if (file.size > SCHOOL_ASSET_MAX_BYTES) {
      throw new Error(`A imagem deve ter no máximo ${MAX_FILE_MB}MB.`);
    }

    if (!SCHOOL_ASSET_ALLOWED_MIME_TYPES.includes(file.type as (typeof SCHOOL_ASSET_ALLOWED_MIME_TYPES)[number])) {
      throw new Error('Formato inválido. Use PNG, JPG, WEBP ou SVG.');
    }
  };

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    field: 'logo' | 'certificate_frame' | 'signature',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      validateImageFile(file);
      const previewDataUrl = await readFileAsDataUrl(file);

      if (field === 'logo') {
        setLogoFile(file);
        setConfig((prev) => ({ ...prev, logoBase64: previewDataUrl }));
        return;
      }

      if (field === 'certificate_frame') {
        setFrameFile(file);
        setConfig((prev) => ({
          ...prev,
          certificateFrameBase64: previewDataUrl,
        }));
        return;
      }

      setConfig((prev) => ({ ...prev, signatureBase64: previewDataUrl }));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description:
          error instanceof Error
            ? error.message
            : 'Não foi possível processar a imagem.',
      });
    }
  };

  const handleClearLogo = () => {
    setLogoFile(null);
    setConfig((prev) => ({
      ...prev,
      logoBase64: undefined,
      logoStoragePath: undefined,
    }));
  };

  const handleClearCertificateFrame = () => {
    setFrameFile(null);
    setConfig((prev) => ({
      ...prev,
      certificateFrameBase64: undefined,
      certificateFrameStoragePath: undefined,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const previousConfig = loadedConfigRef.current;
      const nextConfig: SchoolConfig = { ...config };

      if (logoFile) {
        nextConfig.logoStoragePath = await uploadSchoolAsset('logo', logoFile);
      }

      if (frameFile) {
        nextConfig.certificateFrameStoragePath = await uploadSchoolAsset(
          'certificate_frame',
          frameFile,
        );
      }

      await saveSchoolConfig(nextConfig);

      const previousLogoPath = previousConfig.logoStoragePath?.trim();
      const nextLogoPath = nextConfig.logoStoragePath?.trim();
      if (previousLogoPath && previousLogoPath !== nextLogoPath) {
        await removeSchoolAsset(previousLogoPath).catch((error) => {
          console.warn('Falha ao remover logo antiga do Storage:', error);
        });
      }

      const previousFramePath = previousConfig.certificateFrameStoragePath?.trim();
      const nextFramePath = nextConfig.certificateFrameStoragePath?.trim();
      if (previousFramePath && previousFramePath !== nextFramePath) {
        await removeSchoolAsset(previousFramePath).catch((error) => {
          console.warn('Falha ao remover moldura antiga do Storage:', error);
        });
      }

      loadedConfigRef.current = nextConfig;
      setConfig(nextConfig);
      setLogoFile(null);
      setFrameFile(null);

      toast({
        title: 'Configurações salvas',
        description:
          'As informações da escola foram atualizadas com sucesso no banco de dados.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações Institucionais</DialogTitle>
          <DialogDescription>
            Personalize a identidade da sua escola nos documentos e relatórios do
            sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" /> Dados Básicos
              </h3>

              <div className="space-y-2">
                <Label htmlFor="schoolName">Nome da Escola *</Label>
                <Input
                  id="schoolName"
                  value={config.schoolName}
                  onChange={(e) =>
                    setConfig({ ...config, schoolName: e.target.value })
                  }
                  placeholder="Ex: Escola Estadual de Ensino Médio"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inep">Código INEP</Label>
                  <Input
                    id="inep"
                    value={config.inep || ''}
                    onChange={(e) =>
                      setConfig({ ...config, inep: e.target.value })
                    }
                    placeholder="00000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="themeColor">Cor do Tema</Label>
                  <div className="flex gap-2">
                    <Input
                      id="themeColor"
                      type="color"
                      value={config.themeColor || '#0F172A'}
                      onChange={(e) =>
                        setConfig({ ...config, themeColor: e.target.value })
                      }
                      className="w-12 p-1 h-10"
                    />
                    <Input
                      value={config.themeColor || '#0F172A'}
                      onChange={(e) =>
                        setConfig({ ...config, themeColor: e.target.value })
                      }
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Localização e Contato</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={config.address || ''}
                  onChange={(e) =>
                    setConfig({ ...config, address: e.target.value })
                  }
                  placeholder="Rua, número, bairro"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={config.city || ''}
                    onChange={(e) => setConfig({ ...config, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">UF</Label>
                  <Input
                    id="state"
                    value={config.state || ''}
                    onChange={(e) =>
                      setConfig({ ...config, state: e.target.value })
                    }
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={config.phone || ''}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={config.email || ''}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" /> Identidade Visual
              </h3>

              <div className="space-y-4">
                <Label>Logo da Escola (Storage Privado)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                  {config.logoBase64 ? (
                    <div className="relative">
                      <img
                        src={config.logoBase64}
                        alt="Logo Preview"
                        className="max-h-24 object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleClearLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex flex-col gap-2 h-auto py-4"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Clique para subir logo
                      </span>
                    </Button>
                  )}
                  <input
                    type="file"
                    ref={logoInputRef}
                    className="hidden"
                    accept={ACCEPTED_IMAGE_TYPES}
                    onChange={(e) => handleImageUpload(e, 'logo')}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Formatos: PNG, JPG, WEBP ou SVG. Máximo: {MAX_FILE_MB}MB.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Moldura Lateral dos Certificados (Storage Privado)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[160px]">
                  {config.certificateFrameBase64 ? (
                    <div className="relative">
                      <img
                        src={config.certificateFrameBase64}
                        alt="Moldura Preview"
                        className="h-28 w-20 rounded object-cover border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleClearCertificateFrame}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex flex-col gap-2 h-auto py-4"
                      onClick={() => frameInputRef.current?.click()}
                    >
                      <RectangleHorizontal className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Subir moldura lateral
                      </span>
                    </Button>
                  )}
                  <input
                    type="file"
                    ref={frameInputRef}
                    className="hidden"
                    accept={ACCEPTED_IMAGE_TYPES}
                    onChange={(e) => handleImageUpload(e, 'certificate_frame')}
                  />
                  <p className="text-[11px] text-muted-foreground text-center">
                    A moldura será aplicada apenas na faixa lateral esquerda dos
                    certificados. PNG com transparência é recomendado.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Assinatura Digitalizada do Diretor</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                  {config.signatureBase64 ? (
                    <div className="relative w-full">
                      <img
                        src={config.signatureBase64}
                        alt="Signature Preview"
                        className="max-h-24 mx-auto object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() =>
                          setConfig((prev) => ({ ...prev, signatureBase64: undefined }))
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex flex-col gap-2 h-auto py-4"
                      onClick={() => signatureInputRef.current?.click()}
                    >
                      <FileSignature className="h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Subir assinatura
                      </span>
                    </Button>
                  )}
                  <input
                    type="file"
                    ref={signatureInputRef}
                    className="hidden"
                    accept={ACCEPTED_IMAGE_TYPES}
                    onChange={(e) => handleImageUpload(e, 'signature')}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="directorName">Nome do Diretor(a)</Label>
              <Input
                id="directorName"
                value={config.directorName || ''}
                onChange={(e) =>
                  setConfig({ ...config, directorName: e.target.value })
                }
                placeholder="Para aparecer abaixo da assinatura"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additionalInfo">Rodapé Adicional</Label>
              <Textarea
                id="additionalInfo"
                value={config.additionalInfo || ''}
                onChange={(e) =>
                  setConfig({ ...config, additionalInfo: e.target.value })
                }
                placeholder="Observações que aparecerão ao final de todos os documentos"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-8 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!config.schoolName.trim() || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar Identidade Visual'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

