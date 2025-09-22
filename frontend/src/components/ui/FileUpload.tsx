import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Upload, FileText, X } from 'lucide-react-native';
import { MotiView } from 'moti';
import * as DocumentPicker from 'expo-document-picker';

interface FileUploadProps {
  onFileSelect: (file: DocumentPicker.DocumentPickerResult) => void;
  placeholder?: string;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
}

export default function FileUpload({
  onFileSelect,
  placeholder = "Upload your CV/Resume",
  acceptedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize = 10,
  className = ""
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickDocument = async () => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file size (convert bytes to MB)
        const fileSizeMB = file.size ? file.size / (1024 * 1024) : 0;
        if (fileSizeMB > maxSize) {
          Alert.alert('File Too Large', `File size must be less than ${maxSize}MB`);
          return;
        }

        setSelectedFile(file);
        onFileSelect(result);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    onFileSelect({ canceled: true, assets: [] });
  };

  return (
    <View className={`w-full ${className}`}>
      {!selectedFile ? (
        <TouchableOpacity
          onPress={pickDocument}
          disabled={isUploading}
          className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50 items-center justify-center min-h-[120px]"
        >
          <MotiView
            animate={{
              scale: isUploading ? 1.1 : 1,
              opacity: isUploading ? 0.7 : 1,
            }}
            transition={{
              type: 'spring',
              damping: 15,
              stiffness: 150,
            }}
            className="items-center"
          >
            <Upload color="#3b82f6" size={32} className="mb-2" />
            <Text className="text-blue-600 font-semibold text-base mb-1">
              {isUploading ? 'Selecting...' : 'Upload CV/Resume'}
            </Text>
            <Text className="text-gray-500 text-sm text-center">
              {placeholder}
            </Text>
            <Text className="text-gray-400 text-xs mt-2">
              PDF, DOC, DOCX (Max {maxSize}MB)
            </Text>
          </MotiView>
        </TouchableOpacity>
      ) : (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 150 }}
          className="border border-green-300 rounded-xl p-4 bg-green-50"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <FileText color="#22c55e" size={24} />
              <View className="ml-3 flex-1">
                <Text className="text-green-700 font-semibold text-sm" numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text className="text-green-600 text-xs">
                  {selectedFile.size ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown size'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={removeFile}
              className="bg-red-100 rounded-full p-2 ml-2"
            >
              <X color="#ef4444" size={16} />
            </TouchableOpacity>
          </View>
        </MotiView>
      )}
    </View>
  );
}
