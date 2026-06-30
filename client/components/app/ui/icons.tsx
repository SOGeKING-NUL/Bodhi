import type { ComponentType } from "react";

export type IconProps = {
  size?: string | number;
  className?: string;
  strokeWidth?: number;
};

export type IconType = ComponentType<IconProps>;

export {
  Mic01Icon as InterviewIcon,
  Building06Icon as CompanyIcon,
  Briefcase01Icon as RoleIcon,
  File01Icon as ResumeIcon,
  UserIcon as ProfileIcon,
  Menu01Icon as MenuIcon,
  DashboardSquare01Icon as DashboardIcon,
  FolderLibraryIcon as LibraryIcon,
  ArrowDown01Icon as ChevronDownIcon,
  ArrowUp01Icon as ChevronUpIcon,
  Settings02Icon as SettingsIcon,
  Logout03Icon as LogoutIcon,
  Add01Icon as PlusIcon,
  Delete02Icon as TrashIcon,
  Cancel01Icon as CloseIcon,
  Download01Icon as DownloadIcon,
  Upload01Icon as UploadIcon,
  PencilEdit01Icon as EditIcon,
  Search01Icon as SearchIcon,
  ArrowRight01Icon as ArrowRightIcon,
  ArrowLeft01Icon as ArrowLeftIcon,
  ArrowUpRight01Icon as ArrowUpRightIcon,
  CheckmarkCircle02Icon as CheckIcon,
  Alert02Icon as AlertIcon,
  Target01Icon as TargetIcon,
  BookOpen01Icon as TopicsIcon,
  SourceCodeIcon as CodeIcon,
  AiMagicIcon as AiIcon,
  SparklesIcon as SparkleIcon,
  Award01Icon as AwardIcon,
  ChartLineData01Icon as ChartIcon,
  AnalyticsUpIcon as AnalyticsIcon,
  Calendar01Icon as CalendarIcon,
  Clock01Icon as ClockIcon,
  Camera01Icon as CameraIcon,
  Video01Icon as VideoIcon,
  PlayIcon as PlayIcon,
  Door01Icon as ExitIcon,
  Mic01Icon as MicIcon,
  MicOff01Icon as MicOffIcon,
  CallEnd01Icon as EndCallIcon,
  EyeIcon as EyeIcon,
  Activity01Icon as ActivityIcon,
} from "hugeicons-react";
