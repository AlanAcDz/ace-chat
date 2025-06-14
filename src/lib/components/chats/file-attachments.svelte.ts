import { formatFileSize, getFileIcon } from '$lib/utils';

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
		return getFileIcon(file.type);
	}

	formatFileSize(bytes: number) {
		return formatFileSize(bytes);
	}

	createFileLikeFileList() {
		const dataTransfer = new DataTransfer();
		this.attachedFiles.forEach((file) => {
			dataTransfer.items.add(file);
		});
		return dataTransfer.files;
	}
}

export const createFileAttachmentsHandler = () => new FileAttachments();
