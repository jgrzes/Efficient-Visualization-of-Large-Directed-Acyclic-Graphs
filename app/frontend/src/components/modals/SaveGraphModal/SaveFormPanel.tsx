import React, { useState } from "react";
import { Info, Link as LinkIcon, Lock, Copy, Check } from "lucide-react";

interface SaveFormPanelProps {
  groupName: string;
  setGroupName: (v: string) => void;

  password: string;
  setPassword: (v: string) => void;

  selectedGroup: string | null;
  setSelectedGroup: (v: string | null) => void;

  touched: boolean;

  error: string | null;
  hash: string | null;
}

const SaveFormPanel: React.FC<SaveFormPanelProps> = ({
  groupName,
  setGroupName,
  password,
  setPassword,
  selectedGroup,
  setSelectedGroup,
  touched,
  error,
  hash,
}) => {
  const showGroupPasswordWarning = touched && !!groupName.trim() && !password.trim();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!hash) return;

    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers / restricted clipboard permissions
      const textarea = document.createElement("textarea");
      textarea.value = hash;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="md:w-1/2 w-full flex flex-col">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-gray-700 dark:text-gray-300">
            Group (optional)
          </label>
          <span className="text-[10px] text-gray-500 dark:text-gray-500">
            leave empty to save without a group
          </span>
        </div>

        <input
          type="text"
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
            if (e.target.value !== selectedGroup) setSelectedGroup(null);
          }}
          placeholder="Select from list or type new group name"
          className="
            w-full rounded-lg
            px-2.5 py-1.5
            text-[11px]
            outline-none
            bg-white border border-black/10 text-gray-900
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
            dark:bg-black/60 dark:border-white/10 dark:text-gray-200
            dark:focus:border-blue-500 dark:focus:ring-blue-500/60
          "
        />

        <div className="space-y-1.5 mt-1">
          <label className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-300">
            <Lock size={12} className="text-gray-500 dark:text-gray-400" />
            Group password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              groupName.trim()
                ? "Required when saving to a group"
                : "Fill in only if you use a group"
            }
            className="
              w-full rounded-lg
              px-2.5 py-1.5
              text-[11px]
              outline-none
              bg-white border border-black/10 text-gray-900
              focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
              dark:bg-black/60 dark:border-white/10 dark:text-gray-200
              dark:focus:border-blue-500 dark:focus:ring-blue-500/60
            "
          />

          <div className="flex items-start gap-1.5 text-[10px] text-gray-600 dark:text-gray-400">
            <Info size={11} className="mt-0.5 shrink-0 text-gray-500 dark:text-gray-500" />
            <span>
              If you provide a group name and password:
              <br />
              <span className="text-gray-700 dark:text-gray-300">
                – if this group already exists, the password must match,
              </span>
              <br />
              <span className="text-gray-700 dark:text-gray-300">
                – if it does not exist yet, it will be{" "}
                <span className="text-blue-700 dark:text-blue-300">
                  created with this password
                </span>{" "}
                when you save.
              </span>
            </span>
          </div>
        </div>

        {showGroupPasswordWarning && (
          <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">
            Group password is required when saving to a group.
          </div>
        )}
      </div>

      {error && (
        <div className="text-[11px] text-red-600 dark:text-red-400 mt-3">
          {error}
        </div>
      )}

      {hash && (
        <div
          className="
            mt-3 rounded-lg border px-3 py-2 text-[11px]
            flex flex-col gap-2
            border-emerald-600/30 bg-emerald-600/10 text-emerald-900
            dark:border-emerald-500/50 dark:bg-emerald-500/5 dark:text-emerald-100
          "
        >
          <div className="flex items-center gap-1.5">
            <LinkIcon size={12} />
            <span className="font-semibold">Saved successfully</span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="opacity-80">Graph id:</span>
              <span className="font-mono break-all">{hash}</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="
                inline-flex items-center gap-1
                rounded-md px-2 py-1
                text-[10px] font-medium transition
                border border-emerald-600/30
                bg-emerald-600/10 hover:bg-emerald-600/20
                dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20
              "
              title="Copy graph id"
            >
              {copied ? (
                <>
                  <Check size={12} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} />
                  Copy
                </>
              )}
            </button>
          </div>

          {copied && (
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
              Graph id copied to clipboard
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SaveFormPanel;
