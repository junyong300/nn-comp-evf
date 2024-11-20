import tensorflow as tf

def preprocess_func_gen(config):
    """
        Return a lambda function which is the final preprocessing function for the model.
        The input of this function is supposed to be the same as the data of the provided dataset.

    """
    img = tf.keras.applications.imagenet_utils.preprocess_input(
        img, data_format=None, mode='torch'
        )
    return lambda img: img
