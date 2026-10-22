import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleNormalized: {
    type: String
  },
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }
}, { timestamps: true });

topicSchema.index({ titleNormalized: 1 }, { unique: true });

topicSchema.pre('save', function (next) {
  if (this.title) {
    this.titleNormalized = this.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s([?.!,])/g, '$1');
  }
});

topicSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.titleNormalized;
  return obj;
};

const Topic = mongoose.model('Topic', topicSchema);

export default Topic;