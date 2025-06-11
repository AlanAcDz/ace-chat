import { FileIcon, FileText, Image } from '@lucide/svelte';

class FileAttachments {
	attachedFiles = $state<File[]>([]);
	fileInput: HTMLInputElement | null = $state(null);

	handleAttachClick() {
		this.fileInput?.click();
	}

	handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			const newFiles = Array.from(target.files);
			// Filter for allowed file types
			const allowedFiles = newFiles.filter((file) => {
				const type = file.type;
				const extension = file.name.toLowerCase().split('.').pop();

				return (
					// Images
					type.startsWith('image/') ||
					// PDFs
					type === 'application/pdf' ||
					// Text files
					type.startsWith('text/') ||
					// Additional text file extensions
					['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'ts'].includes(extension || '')
				);
			});

			this.attachedFiles = [...this.attachedFiles, ...allowedFiles];
			// Reset the input
			target.value = '';
		}
	}

	removeFile(index: number) {
		this.attachedFiles = this.attachedFiles.filter((_, i) => i !== index);
	}

	getFileIcon(file: File) {
		const type = file.type;
		if (type.startsWith('image/')) return Image;
		if (type === 'application/pdf') return FileIcon;
		return FileText;
	}

	formatFileSize(bytes: number) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
}

export const createFileAttachmentsHandler = () => new FileAttachments();
