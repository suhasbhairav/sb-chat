"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRealtimeVoice } from "@/hooks/useRealtimeVoice";
import { exportChatFile, getChatTitle, makeId, normalizeMessages, sanitizeBaseUrlForStorage, sanitizeMessages } from "@/lib/chat-utils";
import { usesDefaultTemperatureOnly } from "@/lib/model-compatibility";
import { getDefaultChatSettings, getProviderConfig } from "@/lib/providers";
import { AUTO_REALTIME_MODEL, resolveRealtimeModel } from "@/lib/voice-models";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translate } from "@/lib/i18n";

const SETTINGS_KEY = "sb-chat-settings";
const defaults = getDefaultChatSettings();

async function libraryAction(action, payload = {}) {
  const response = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Library action failed.");
  }

  return data;
}

async function loadMemoryStore() {
  const response = await fetch("/api/memory");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not load memory.");
  }

  return data.memories || [];
}

async function readChatStream(response, { onDone, onError, onToken }) {
  if (!response.body) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The model request failed.");
    onDone(data);
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "The model request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);

      if (event.type === "token") {
        onToken(event.token || "");
      }

      if (event.type === "done") {
        onDone(event);
      }

      if (event.type === "error") {
        onError(event.error || "The model request failed.");
      }
    }
  }
}

function filterChats(chats, { selectedFolderId, selectedWorkspaceId, searchQuery }) {
  const query = searchQuery.trim().toLowerCase();

  return chats
    .filter((chat) => chat.workspaceId === selectedWorkspaceId)
    .filter((chat) => (selectedFolderId ? chat.folderId === selectedFolderId : true))
    .filter((chat) => {
      if (!query) return true;
      const haystack = [
        chat.title,
        chat.model,
        chat.provider,
        ...(chat.messages || []).map((message) => message.content),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

export function useChatController() {
  const [provider, setProvider] = useState(defaults.provider);
  const [baseUrl, setBaseUrl] = useState(defaults.baseUrl);
  const [model, setModel] = useState(defaults.model);
  const [apiKey, setApiKey] = useState("");
  const [temperature, setTemperature] = useState(defaults.temperature);
  const [guardrails, setGuardrails] = useState(defaults.guardrails);
  const [theme, setTheme] = useState(defaults.theme);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [temporaryChat, setTemporaryChat] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [documentChatEnabled, setDocumentChatEnabled] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memories, setMemories] = useState([]);
  const [memoryError, setMemoryError] = useState("");
  const [realtimeModel, setRealtimeModel] = useState(AUTO_REALTIME_MODEL);
  const [modelCatalog, setModelCatalog] = useState([]);
  const [modelCatalogStatus, setModelCatalogStatus] = useState("idle");
  const [modelCatalogError, setModelCatalogError] = useState("");
  const [modelCatalogSource, setModelCatalogSource] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const importChatsRef = useRef(null);

  const currentProvider = useMemo(() => getProviderConfig(provider), [provider]);
  const hasMessages = messages.length > 0;
  const canSend = input.trim().length > 0 && model.trim().length > 0 && !isSending;
  const chatTitle = useMemo(() => getChatTitle(messages), [messages]);
  const visibleChats = useMemo(
    () => filterChats(chats, { selectedFolderId, selectedWorkspaceId, searchQuery }),
    [chats, searchQuery, selectedFolderId, selectedWorkspaceId],
  );
  const resolvedRealtimeModel = useMemo(
    () => resolveRealtimeModel({ modelCatalog, realtimeModel, selectedModel: model }),
    [model, modelCatalog, realtimeModel],
  );
  const realtime = useRealtimeVoice({
    apiKey,
    realtimeModel: resolvedRealtimeModel,
    onAssistantTranscript: (content) => {
      setMessages((current) =>
        normalizeMessages(current.concat({
          id: makeId(),
          role: "assistant",
          content,
        })),
      );
    },
    onUserTranscript: (content) => {
      setMessages((current) =>
        normalizeMessages(current.concat({
          id: makeId(),
          role: "user",
          content,
        })),
      );
    },
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (window.innerWidth <= 900) {
        setSidebarOpen(false);
      }

      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const savedProvider = parsed.provider ?? defaults.provider;
          const savedProviderConfig = getProviderConfig(savedProvider);

          setProvider(savedProvider);
          setBaseUrl(parsed.baseUrl ?? savedProviderConfig.defaultBaseUrl);
          setModel(parsed.model ?? savedProviderConfig.defaultModel);
          setTemperature(parsed.temperature ?? defaults.temperature);
          setGuardrails(parsed.guardrails ?? defaults.guardrails);
          setTheme(parsed.theme ?? defaults.theme);
          setLocale(SUPPORTED_LOCALES.includes(parsed.locale) ? parsed.locale : DEFAULT_LOCALE);
          setWebSearchEnabled(Boolean(parsed.webSearchEnabled));
          setDocumentChatEnabled(Boolean(parsed.documentChatEnabled));
          setMemoryEnabled(parsed.memoryEnabled !== false);
          setRealtimeModel(parsed.realtimeModel ?? AUTO_REALTIME_MODEL);
        } catch {
          localStorage.removeItem(SETTINGS_KEY);
        }
      }

      const response = await fetch("/api/library");
      const store = await response.json();
      if (ignore) return;

      setWorkspaces(store.workspaces || []);
      setFolders(store.folders || []);
      setChats(store.chats || []);
      setSelectedWorkspaceId(store.workspaces?.[0]?.id || null);
      await refreshTokenUsage();
      await refreshMemories();
    }

    load().catch((error) => {
      setMessages([{ id: makeId(), role: "error", content: error.message || "Could not load chat library." }]);
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        provider,
        baseUrl: sanitizeBaseUrlForStorage(baseUrl),
        model,
        temperature,
        guardrails,
        theme,
        locale,
        webSearchEnabled,
        documentChatEnabled,
        memoryEnabled,
        realtimeModel,
      }),
    );
  }, [provider, baseUrl, model, temperature, guardrails, theme, locale, webSearchEnabled, documentChatEnabled, memoryEnabled, realtimeModel]);

  useEffect(() => {
    let ignore = false;

    async function loadModels() {
      setModelCatalogStatus("loading");
      setModelCatalogError("");

      try {
        const params = new URLSearchParams({ provider, baseUrl });
        const response = await fetch(`/api/models?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load model catalog.");
        }

        if (ignore) return;
        setModelCatalog(data.models || []);
        setModelCatalogSource(data.sourceLabel || "");
        setModelCatalogStatus("ready");
      } catch (error) {
        if (ignore) return;
        setModelCatalog([]);
        setModelCatalogError(error.message || "Could not load model catalog.");
        setModelCatalogStatus("error");
      }
    }

    loadModels();

    return () => {
      ignore = true;
    };
  }, [baseUrl, provider]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  function replaceStore(store) {
    setWorkspaces(store.workspaces || []);
    setFolders(store.folders || []);
    setChats(store.chats || []);
  }

  async function refreshTokenUsage() {
    const response = await fetch("/api/token-usage");
    const data = await response.json();

    if (response.ok) {
      setTokenUsage(data);
    }
  }

  async function refreshMemories() {
    try {
      const nextMemories = await loadMemoryStore();
      setMemories(nextMemories);
      setMemoryError("");
    } catch (error) {
      setMemoryError(error.message || "Could not load memory.");
    }
  }

  function currentChatPayload(nextMessages = messages, overrides = {}) {
    const existingChat = chats.find((chat) => chat.id === activeChatId);
    const workspaceId = overrides.workspaceId || selectedWorkspaceId || workspaces[0]?.id;
    const folderId = overrides.folderId === undefined ? selectedFolderId : overrides.folderId;

    return {
      id: overrides.id || activeChatId || makeId(),
      workspaceId,
      folderId,
      title: getChatTitle(nextMessages, "Untitled chat"),
      messages: sanitizeMessages(nextMessages),
      provider,
      model,
      baseUrl: sanitizeBaseUrlForStorage(baseUrl),
      guardrails,
      temperature: Number(temperature),
      temporary: temporaryChat,
      createdAt: existingChat?.createdAt,
    };
  }

  async function saveChat(nextMessages = messages, overrides = {}) {
    if (temporaryChat || !nextMessages.length) return null;

    const chat = currentChatPayload(nextMessages, overrides);
    const result = await libraryAction("upsertChat", { chat });
    replaceStore(result.store);
    setActiveChatId(result.chat.id);
    return result.chat;
  }

  function changeProvider(nextProvider) {
    const next = getProviderConfig(nextProvider);
    setProvider(nextProvider);
    setBaseUrl(next.defaultBaseUrl);
    setModel(next.defaultModel);
    setWebSearchEnabled(false);
    if (usesDefaultTemperatureOnly(nextProvider, next.defaultModel)) {
      setTemperature(1);
    }
  }

  function changeModel(nextModel) {
    setModel(nextModel);
    if (usesDefaultTemperatureOnly(provider, nextModel)) {
      setTemperature(1);
    }
  }

  function newChat() {
    setActiveChatId(null);
    setMessages([]);
    setInput("");
    setTemporaryChat(false);
    setSettingsOpen(false);
    inputRef.current?.focus();
  }

  function pickSuggestion(prompt) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function selectChat(chatId) {
    const chat = chats.find((item) => item.id === chatId);
    if (!chat) return;

    setActiveChatId(chat.id);
    setSelectedWorkspaceId(chat.workspaceId);
    setSelectedFolderId(chat.folderId || null);
    setMessages(normalizeMessages(chat.messages || [], chat.id));
    setProvider(chat.provider || defaults.provider);
    setBaseUrl(chat.baseUrl || getProviderConfig(chat.provider || defaults.provider).defaultBaseUrl);
    setModel(chat.model || getProviderConfig(chat.provider || defaults.provider).defaultModel);
    setTemperature(chat.temperature ?? defaults.temperature);
    setGuardrails(chat.guardrails ?? defaults.guardrails);
    setWebSearchEnabled(false);
    setTemporaryChat(false);
    setInput("");
    setSettingsOpen(false);
    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  }

  function selectWorkspace(workspaceId) {
    setSelectedWorkspaceId(workspaceId);
    setSelectedFolderId(null);
    newChat();
    setSelectedWorkspaceId(workspaceId);
  }

  function selectFolder(folderId) {
    setSelectedFolderId(folderId);
    newChat();
    setSelectedFolderId(folderId);
  }

  async function createWorkspace() {
    const name = window.prompt(translate(locale, "prompts.workspaceName"));
    if (!name?.trim()) return;

    const result = await libraryAction("createWorkspace", { name });
    replaceStore(result.store);
    setSelectedWorkspaceId(result.workspace.id);
    setSelectedFolderId(null);
    newChat();
    setSelectedWorkspaceId(result.workspace.id);
  }

  async function createFolder() {
    const workspaceId = selectedWorkspaceId || workspaces[0]?.id;
    if (!workspaceId) return;

    const name = window.prompt(translate(locale, "prompts.folderName"));
    if (!name?.trim()) return;

    const result = await libraryAction("createFolder", { workspaceId, name });
    replaceStore(result.store);
    setSelectedFolderId(result.folder.id);
    newChat();
    setSelectedFolderId(result.folder.id);
  }

  async function deleteSavedChat(chatId) {
    const result = await libraryAction("deleteChat", { chatId });
    replaceStore(result.store);

    if (activeChatId === chatId) {
      newChat();
    }
  }

  async function moveActiveChat(folderId) {
    if (!activeChatId) {
      await saveChat(messages, { folderId });
      setSelectedFolderId(folderId || null);
      return;
    }

    const result = await libraryAction("moveChat", {
      chatId: activeChatId,
      folderId,
      workspaceId: selectedWorkspaceId,
    });
    replaceStore(result.store);
    setSelectedFolderId(folderId || null);
  }

  async function moveSavedChat(chatId, folderId) {
    const chat = chats.find((item) => item.id === chatId);
    const workspaceId = chat?.workspaceId || selectedWorkspaceId;
    const result = await libraryAction("moveChat", {
      chatId,
      folderId,
      workspaceId,
    });

    replaceStore(result.store);

    if (activeChatId === chatId) {
      setSelectedFolderId(folderId || null);
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const userMessage = { id: makeId(), role: "user", content };
    const pendingId = makeId();
    const usageChatId = activeChatId || (!temporaryChat ? makeId() : null);
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { id: pendingId, role: "assistant", content: "", pending: true }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          baseUrl,
          model,
          apiKey,
          chatId: usageChatId,
          folderId: selectedFolderId,
          temperature: usesDefaultTemperatureOnly(provider, model) ? 1 : Number(temperature),
          guardrails,
          webSearch: webSearchEnabled && provider === "openai",
          documentChat: documentChatEnabled,
          memoryEnabled,
          messages: sanitizeMessages(nextMessages),
          temporary: temporaryChat,
          workspaceId: selectedWorkspaceId,
        }),
      });

      let assistantContent = "";
      let finalEvent = null;
      let streamError = null;

      await readChatStream(response, {
        onToken: (token) => {
          assistantContent += token;
          setMessages((current) =>
            current.map((message) =>
              message.id === pendingId
                ? {
                    ...message,
                    content: assistantContent,
                    pending: false,
                  }
                : message,
            ),
          );
        },
        onDone: (event) => {
          finalEvent = event;
        },
        onError: (error) => {
          streamError = error;
        },
      });

      if (streamError) {
        throw new Error(streamError);
      }

      const completedMessages = nextMessages.concat({
        id: pendingId,
        role: "assistant",
        content: finalEvent?.message || assistantContent || "The model returned an empty response.",
        guardrails: finalEvent?.guardrails,
      });

      setMessages(completedMessages);
      if (!temporaryChat) {
        await saveChat(completedMessages, { id: usageChatId });
      }
      await refreshTokenUsage();
    } catch (error) {
      const failedMessages = nextMessages.concat({
        id: pendingId,
        role: "error",
        content: error.message || "Something went wrong.",
      });
      setMessages(failedMessages);
      if (!temporaryChat) {
        await saveChat(nextMessages, { id: usageChatId }).catch(() => {});
      }
      await refreshTokenUsage().catch(() => {});
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function copyMessage(message) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 1300);
  }

  async function rememberMessage(message) {
    if (!message?.content?.trim()) return;

    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message.content,
          sourceChatId: activeChatId,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save memory.");
      }

      setMemories(data.memories || []);
      setMemoryError("");
    } catch (error) {
      setMemoryError(error.message || "Could not save memory.");
      throw error;
    }
  }

  async function addMemory(content) {
    const response = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await response.json();

    if (!response.ok) {
      const error = data.error || "Could not save memory.";
      setMemoryError(error);
      throw new Error(error);
    }

    setMemories(data.memories || []);
    setMemoryError("");
    return data.memory;
  }

  async function updateMemory(memoryId, content) {
    const response = await fetch("/api/memory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memoryId, content }),
    });
    const data = await response.json();

    if (!response.ok) {
      const error = data.error || "Could not update memory.";
      setMemoryError(error);
      throw new Error(error);
    }

    setMemories(data.memories || []);
    setMemoryError("");
    return data.memory;
  }

  async function deleteMemory(memoryId) {
    const response = await fetch(`/api/memory?id=${encodeURIComponent(memoryId)}`, {
      method: "DELETE",
    });
    const data = await response.json();

    if (!response.ok) {
      const error = data.error || "Could not delete memory.";
      setMemoryError(error);
      throw new Error(error);
    }

    setMemories(data.memories || []);
    setMemoryError("");
    return data.memory;
  }

  function exportChat() {
    exportChatFile({ provider, baseUrl, model, guardrails, messages });
  }

  async function exportChatLibrary() {
    const response = await fetch("/api/library");
    const store = await response.json();

    if (!response.ok) {
      throw new Error(store.error || "Could not export chat library.");
    }

    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            app: "SB Chat",
            type: "sb-chat-library",
            store,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sb-chat-library-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importChatLibrary(file, mode = "merge") {
    if (!file) return;

    const text = await file.text();
    const imported = JSON.parse(text);
    const result = await libraryAction("importStore", {
      mode,
      store: imported.store || imported,
    });

    replaceStore(result.store);

    if (result.store.workspaces?.length && !result.store.workspaces.some((workspace) => workspace.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(result.store.workspaces[0].id);
      setSelectedFolderId(null);
    }

    if (importChatsRef.current) {
      importChatsRef.current.value = "";
    }

    return result;
  }

  return {
    activeChatId,
    apiKey,
    baseUrl,
    canSend,
    chatTitle,
    copiedId,
    currentProvider,
    documentChatEnabled,
    documentsOpen,
    docsOpen,
    folders,
    guardrails,
    hasMessages,
    input,
    inputRef,
    importChatsRef,
    isSending,
    locale,
    memories,
    memoryEnabled,
    memoryError,
    messages,
    model,
    modelCatalog,
    modelCatalogError,
    modelCatalogSource,
    modelCatalogStatus,
    provider,
    realtimeModel,
    resolvedRealtimeModel,
    scrollRef,
    searchQuery,
    selectedFolderId,
    selectedWorkspaceId,
    settingsOpen,
    sidebarOpen,
    temperature,
    temporaryChat,
    theme,
    tokenUsage,
    usageOpen,
    visibleChats,
    webSearchEnabled,
    workspaces,
    changeProvider,
    addMemory,
    copyMessage,
    createFolder,
    createWorkspace,
    deleteSavedChat,
    deleteMemory,
    exportChat,
    exportChatLibrary,
    importChatLibrary,
    moveActiveChat,
    moveSavedChat,
    newChat,
    pickSuggestion,
    rememberMessage,
    refreshMemories,
    saveChat,
    selectChat,
    selectFolder,
    selectWorkspace,
    sendMessage,
    setApiKey,
    setBaseUrl,
    setDocumentChatEnabled,
    setDocumentsOpen,
    setDocsOpen,
    setGuardrails,
    setInput,
    setLocale,
    setMemoryEnabled,
    setMessages,
    setModel: changeModel,
    setRealtimeModel,
    setSearchQuery,
    setSettingsOpen,
    setSidebarOpen,
    setTemperature,
    setTemporaryChat,
    setTheme,
    setUsageOpen,
    setWebSearchEnabled,
    updateMemory,
    toggleVoiceChat: realtime.toggleVoiceChat,
    voiceError: realtime.voiceError,
    voiceState: realtime.voiceState,
  };
}
