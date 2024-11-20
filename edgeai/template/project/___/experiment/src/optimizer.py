import torch.optim as optim

def get_optimizer(model, config):
    """Returns optimizer and scheduler"""
    if config['optimizer'].lower() == 'sgd':
        optimizer = optim.SGD(
            model.parameters(),
            lr=config['learning_rate'],
            momentum=config['momentum'],
            weight_decay=config['weight_decay']
        )
    else:
        optimizer = optim.Adam(
            model.parameters(),
            lr=config['learning_rate'],
            weight_decay=config['weight_decay']
        )
    
    scheduler = optim.lr_scheduler.StepLR(
        optimizer,
        step_size=config['scheduler_step_size'],
        gamma=config['scheduler_gamma']
    )
    
    return optimizer, scheduler