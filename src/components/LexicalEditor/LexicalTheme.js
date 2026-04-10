const theme = {
  ltr: 'text-left',
  rtl: 'text-right',
  placeholder: 'text-slate-400 overflow-hidden absolute top-4 left-4 select-none pointer-events-none text-base',
  paragraph: 'mb-2 relative',
  quote: 'border-l-4 border-slate-300 pl-4 italic text-slate-600',
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal ml-6',
    ul: 'list-disc ml-6',
    listitem: 'mb-1',
  },
  image: 'max-w-full rounded-lg',
  link: 'text-primary hover:underline cursor-pointer',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
};

export default theme;
