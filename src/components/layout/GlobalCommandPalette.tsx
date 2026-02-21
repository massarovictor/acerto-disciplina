import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3, CornerDownLeft, Search, Sparkles } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { SearchNavItem, getSearchNavItems } from "@/lib/navigationSearchIndex";
import { resolveUserRole } from "@/lib/dashboardRoleScope";

const RECENT_SEARCH_ITEMS_KEY = "mavic:recent-search-items";
const MAX_RECENT_ITEMS = 6;

const normalizeSearchTerm = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const scoreSearchItem = (item: SearchNavItem, normalizedQuery: string) => {
  if (!normalizedQuery) return 0;

  const label = normalizeSearchTerm(item.label);
  const description = normalizeSearchTerm(item.description);
  const keywords = item.keywords.map((keyword) => normalizeSearchTerm(keyword));
  const path = normalizeSearchTerm(item.path);

  let score = 0;

  if (label === normalizedQuery) score += 120;
  if (label.startsWith(normalizedQuery)) score += 90;
  if (label.includes(normalizedQuery)) score += 65;
  if (description.includes(normalizedQuery)) score += 40;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) score += 55;
  if (path.includes(normalizedQuery)) score += 20;
  if (item.group === "Ações rápidas") score += 5;

  return score;
};

const loadRecentItemIds = () => {
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_ITEMS_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
};

const persistRecentItemIds = (ids: string[]) => {
  try {
    window.localStorage.setItem(RECENT_SEARCH_ITEMS_KEY, JSON.stringify(ids.slice(0, MAX_RECENT_ITEMS)));
  } catch {
    // Silently ignore storage errors in restricted browsers/sessions.
  }
};

export const GlobalCommandPalette = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentItemIds, setRecentItemIds] = useState<string[]>([]);
  const role = resolveUserRole({ profile, user });

  const items = useMemo(() => getSearchNavItems(role), [role]);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const groupedItems = useMemo(
    () => ({
      pages: items.filter((item) => item.group === "Páginas"),
      quickActions: items.filter((item) => item.group === "Ações rápidas"),
    }),
    [items],
  );
  const normalizedQuery = useMemo(() => normalizeSearchTerm(query), [query]);

  const filteredResults = useMemo(() => {
    if (!normalizedQuery) {
      return groupedItems;
    }

    const ranked = items
      .map((item) => ({ item, score: scoreSearchItem(item, normalizedQuery) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label, "pt-BR"))
      .map((entry) => entry.item);

    return {
      pages: ranked.filter((item) => item.group === "Páginas"),
      quickActions: ranked.filter((item) => item.group === "Ações rápidas"),
    };
  }, [groupedItems, items, normalizedQuery]);

  const recentItems = useMemo(
    () =>
      recentItemIds
        .map((id) => itemsById.get(id))
        .filter((item): item is SearchNavItem => Boolean(item)),
    [itemsById, recentItemIds],
  );

  useEffect(() => {
    setRecentItemIds(loadRecentItemIds());
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      setOpen((previous) => !previous);
    };
    const handleOpenRequest = () => setOpen(true);

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-global-search", handleOpenRequest);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleOpenRequest);
    };
  }, []);

  const openPalette = () => setOpen(true);

  const rememberItem = (itemId: string) => {
    setRecentItemIds((current) => {
      const next = [itemId, ...current.filter((id) => id !== itemId)].slice(0, MAX_RECENT_ITEMS);
      persistRecentItemIds(next);
      return next;
    });
  };

  const handleSelect = (item: SearchNavItem) => {
    rememberItem(item.id);
    setOpen(false);
    setQuery("");
    navigate(item.path);
  };

  const hasResults = filteredResults.pages.length > 0 || filteredResults.quickActions.length > 0;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={openPalette}
        aria-label="Buscar função, página ou ação"
        title="Buscar função, página ou ação"
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">Buscar função, página ou ação</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Digite para buscar no sistema (ex.: certificados, notas, ocorrência)..."
          value={query}
          onValueChange={setQuery}
        />
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Busca inteligente por páginas e ações do sistema</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium">
              Enter
            </kbd>
            <span>abrir</span>
          </div>
        </div>
        <CommandList>
          <CommandEmpty>
            <div className="py-4 text-center">
              <p className="font-medium">Nada encontrado para "{query}"</p>
              <p className="text-xs text-muted-foreground mt-1">Tente por sinônimo, nome da página ou ação.</p>
            </div>
          </CommandEmpty>

          {!normalizedQuery && recentItems.length > 0 ? (
            <CommandGroup heading="Acessados recentemente">
              {recentItems.map((item) => (
                <CommandItem
                  key={`recent-${item.id}`}
                  value={`${item.label} ${item.description} ${item.keywords.join(" ")}`}
                  onSelect={() => handleSelect(item)}
                  className="gap-3"
                >
                  <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-[10px] h-5">
                    {item.group === "Páginas" ? "Página" : "Ação"}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {filteredResults.pages.length > 0 ? (
            <CommandGroup heading="Páginas">
              {filteredResults.pages.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.description} ${item.keywords.join(" ")}`}
                  onSelect={() => handleSelect(item)}
                  className="gap-3"
                >
                  <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                  </div>
                  <Badge variant="outline" className="ml-auto text-[10px] h-5">
                    Página
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {filteredResults.quickActions.length > 0 ? (
            <CommandGroup heading="Ações rápidas">
              {filteredResults.quickActions.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.description} ${item.keywords.join(" ")}`}
                  onSelect={() => handleSelect(item)}
                  className="gap-3"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{item.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.description}</span>
                  </div>
                  <CommandShortcut>
                    <CornerDownLeft className="h-3.5 w-3.5" />
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {!normalizedQuery && !hasResults ? (
            <CommandGroup heading="Sugestões">
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Sem itens disponíveis para o seu perfil.
              </div>
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
};
